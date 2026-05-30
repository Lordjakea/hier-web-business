import os
from datetime import datetime
from urllib.parse import parse_qs, urlparse

from flask import Blueprint, current_app, jsonify, request
from svix.webhooks import Webhook, WebhookVerificationError

from your_app.auth import staff_required
from your_app.extensions import db
from your_app.models import (
    BusinessAccount,
    CampaignLead,
    MarketingAttribution,
    MarketingEmailCampaign,
    MarketingEmailRecipient,
    MarketingLead,
)
from your_app.marketing_attribution.services import (
    import_marketing_leads,
    sync_resend_campaign_metrics,
)


marketing_bp = Blueprint("marketing_attribution", __name__)


EVENT_TO_FIELD = {
    "email.delivered": "delivered_at",
    "email.opened": "opened_at",
    "email.clicked": "clicked_at",
    "email.bounced": "bounced_at",
    "email.complained": "complained_at",
}


def _event_payload(event):
    data = event.get("data") or {}
    return data if isinstance(data, dict) else {}


def _event_email_id(payload):
    return payload.get("email_id") or payload.get("id") or payload.get("message_id")


def _event_email(payload):
    to_value = payload.get("to")
    if isinstance(to_value, list) and to_value:
        first = to_value[0]
        return first.get("email") if isinstance(first, dict) else str(first)
    if isinstance(to_value, str):
        return to_value
    return payload.get("email") or payload.get("recipient")


def _parse_timestamp(value):
    if not value:
        return datetime.utcnow()
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(value)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.utcnow()


def _find_recipient(payload):
    resend_email_id = _event_email_id(payload)
    email = (_event_email(payload) or "").strip().lower()

    if resend_email_id:
        recipient = MarketingEmailRecipient.query.filter_by(resend_email_id=resend_email_id).first()
        if recipient:
            return recipient

    if email:
        return (
            MarketingEmailRecipient.query.filter_by(email=email)
            .order_by(MarketingEmailRecipient.created_at.desc())
            .first()
        )

    return None


def _save_click_attribution(recipient, payload, event_time):
    url = payload.get("url") or payload.get("link", {}).get("url")
    if not url:
        return

    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    utm_source = (params.get("utm_source") or [""])[0]
    utm_medium = (params.get("utm_medium") or [""])[0]
    utm_campaign = (params.get("utm_campaign") or [""])[0]
    utm_content = (params.get("utm_content") or [""])[0]

    if not all([utm_source, utm_medium, utm_campaign, utm_content]):
        return

    attribution = (
        MarketingAttribution.query.filter_by(
            recipient_id=recipient.id,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
        )
        .order_by(MarketingAttribution.first_seen_at.asc())
        .first()
    )

    if not attribution:
        campaign = MarketingEmailCampaign.query.filter_by(slug=utm_campaign).first()
        attribution = MarketingAttribution(
            email=recipient.email,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
            landing_path=parsed.path,
            first_seen_at=event_time,
            campaign_id=campaign.id if campaign else recipient.campaign_id,
            recipient_id=recipient.id,
        )
        db.session.add(attribution)


@marketing_bp.post("/api/webhooks/resend")
def resend_webhook():
    secret = os.environ.get("RESEND_WEBHOOK_SECRET") or current_app.config.get("RESEND_WEBHOOK_SECRET")
    if not secret:
        current_app.logger.error("RESEND_WEBHOOK_SECRET is not configured")
        return jsonify({"ok": False, "error": "Webhook not configured"}), 500

    raw_body = request.get_data()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        event = Webhook(secret).verify(raw_body, headers)
    except WebhookVerificationError:
        return jsonify({"ok": False, "error": "Invalid signature"}), 401

    event_type = event.get("type")
    payload = _event_payload(event)
    recipient = _find_recipient(payload)

    if recipient and event_type in EVENT_TO_FIELD:
        event_time = _parse_timestamp(payload.get("created_at") or event.get("created_at"))
        setattr(recipient, EVENT_TO_FIELD[event_type], event_time)

        if event_type == "email.clicked":
            _save_click_attribution(recipient, payload, event_time)

        db.session.commit()

    return jsonify({"ok": True})


@marketing_bp.get("/api/staff/marketing/campaigns")
@staff_required
def staff_marketing_campaigns():
    campaigns = MarketingEmailCampaign.query.order_by(MarketingEmailCampaign.created_at.desc()).all()
    return jsonify({"ok": True, "campaigns": [_campaign_summary(campaign) for campaign in campaigns]})


@marketing_bp.get("/api/staff/marketing/campaigns/<int:campaign_id>")
@staff_required
def staff_marketing_campaign_detail(campaign_id):
    campaign = MarketingEmailCampaign.query.get_or_404(campaign_id)
    data = _campaign_summary(campaign)
    data["recipients"] = _campaign_people(campaign)
    return jsonify({"ok": True, "campaign": data})


@marketing_bp.post("/api/staff/marketing/leads/import")
@staff_required
def staff_marketing_leads_import():
    rows = (request.get_json(silent=True) or {}).get("rows") or []
    result = import_marketing_leads(rows, sync_contacts=True)
    return jsonify(
        {
            "ok": True,
            "imported": result["imported"],
            "updated": result["updated"],
            "skipped": result["skipped"],
            "errors": result["errors"],
            "leads": [_lead_detail(lead) for lead in result["leads"]],
        }
    )


@marketing_bp.post("/api/staff/marketing/campaigns/sync")
@staff_required
def staff_marketing_campaigns_sync():
    payload = request.get_json(silent=True) or {}
    campaign_id = payload.get("campaign_id")
    synced = sync_resend_campaign_metrics(campaign_id=campaign_id)
    response = {"ok": True, "synced_campaigns": synced}

    if campaign_id:
        campaign = MarketingEmailCampaign.query.get(campaign_id)
        if campaign:
            data = _campaign_summary(campaign)
            data["recipients"] = _campaign_people(campaign)
            response["campaign"] = data

    return jsonify(response)


@marketing_bp.get("/api/staff/marketing/attribution")
@staff_required
def staff_marketing_attribution():
    query = MarketingAttribution.query.order_by(MarketingAttribution.first_seen_at.desc())
    campaign_id = request.args.get("campaign_id")
    converted = request.args.get("converted")

    if campaign_id:
        query = query.filter(MarketingAttribution.campaign_id == int(campaign_id))
    if converted == "true":
        query = query.filter(MarketingAttribution.converted_at.isnot(None))
    elif converted == "false":
        query = query.filter(MarketingAttribution.converted_at.is_(None))

    return jsonify({"ok": True, "items": [_attribution_detail(item) for item in query.limit(500).all()]})


def _campaign_summary(campaign):
    recipients = campaign.recipients
    leads = [assignment.lead for assignment in campaign.campaign_leads]
    lead_count = len(leads)
    sent_count = len(recipients)
    delivered_count = campaign.delivered_count_cache
    open_count = campaign.open_count_cache
    click_count = campaign.click_count_cache
    bounce_count = campaign.bounce_count_cache
    if delivered_count is None:
        delivered_count = sum(1 for item in recipients if item.delivered_at)
    if open_count is None:
        open_count = sum(1 for item in recipients if item.opened_at)
    if click_count is None:
        click_count = sum(1 for item in recipients if item.clicked_at)
    if bounce_count is None:
        bounce_count = sum(1 for item in recipients if item.bounced_at)

    signups = MarketingAttribution.query.filter(
        MarketingAttribution.campaign_id == campaign.id,
        MarketingAttribution.converted_at.isnot(None),
    ).count()
    lead_signups = sum(1 for lead in leads if lead.converted_at)
    paid_businesses = sum(1 for lead in leads if lead.paid_at)
    signups = max(signups, lead_signups)
    funnel = _campaign_funnel(
        lead_count=lead_count,
        delivered_count=delivered_count,
        open_count=open_count,
        click_count=click_count,
        signups=signups,
        paid_businesses=paid_businesses,
    )

    return {
        "id": campaign.id,
        "name": campaign.name,
        "slug": campaign.slug,
        "subject": campaign.subject,
        "resend_audience_id": campaign.resend_audience_id,
        "resend_broadcast_id": campaign.resend_broadcast_id,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        "sent_at": campaign.sent_at.isoformat() if campaign.sent_at else None,
        "lead_count": lead_count,
        "emails_sent": sent_count,
        "sent_count": sent_count,
        "delivered_count": delivered_count,
        "open_count": open_count,
        "click_count": click_count,
        "bounce_count": bounce_count,
        "complaint_count": sum(1 for item in recipients if item.complained_at),
        "business_signups_attributed": signups,
        "paid_businesses": paid_businesses,
        "conversion_rate": (signups / lead_count) if lead_count else ((signups / sent_count) if sent_count else 0),
        "open_rate": funnel["open_rate"],
        "ctr": funnel["ctr"],
        "signup_rate": funnel["signup_rate"],
        "paid_conversion_rate": funnel["paid_conversion_rate"],
        "funnel": funnel,
    }


def _campaign_funnel(lead_count, delivered_count, open_count, click_count, signups, paid_businesses):
    return {
        "leads_imported": lead_count,
        "emails_delivered": delivered_count,
        "emails_opened": open_count,
        "emails_clicked": click_count,
        "businesses_signed_up": signups,
        "paid_businesses": paid_businesses,
        "open_rate": (open_count / delivered_count) if delivered_count else 0,
        "ctr": (click_count / delivered_count) if delivered_count else 0,
        "signup_rate": (signups / lead_count) if lead_count else 0,
        "paid_conversion_rate": (paid_businesses / lead_count) if lead_count else 0,
    }


def _campaign_people(campaign):
    lead_rows = [_lead_as_recipient(assignment.lead, campaign) for assignment in campaign.campaign_leads]
    recipient_rows = [_recipient_detail(recipient) for recipient in campaign.recipients]
    seen = {row["email"] for row in lead_rows}
    return lead_rows + [row for row in recipient_rows if row["email"] not in seen]


def _lead_as_recipient(lead, campaign):
    matching_recipient = (
        MarketingEmailRecipient.query.filter_by(campaign_id=campaign.id, email=lead.email)
        .order_by(MarketingEmailRecipient.created_at.desc())
        .first()
    )
    business = BusinessAccount.query.get(lead.business_account_id) if lead.business_account_id else None
    return {
        "id": matching_recipient.id if matching_recipient else lead.id,
        "lead_id": lead.id,
        "campaign_id": campaign.id,
        "email": lead.email,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "company_name": lead.company_name,
        "job_title": lead.job_title,
        "city": lead.city,
        "resend_email_id": matching_recipient.resend_email_id if matching_recipient else None,
        "delivered_at": matching_recipient.delivered_at.isoformat() if matching_recipient and matching_recipient.delivered_at else None,
        "opened_at": matching_recipient.opened_at.isoformat() if matching_recipient and matching_recipient.opened_at else None,
        "clicked_at": matching_recipient.clicked_at.isoformat() if matching_recipient and matching_recipient.clicked_at else None,
        "bounced_at": matching_recipient.bounced_at.isoformat() if matching_recipient and matching_recipient.bounced_at else None,
        "complained_at": matching_recipient.complained_at.isoformat() if matching_recipient and matching_recipient.complained_at else None,
        "utm_content_clicked": None,
        "signup_status": "converted" if lead.converted_at else "not_converted",
        "linked_business_account": {
            "id": business.id,
            "user_id": business.owner_user_id,
            "name": getattr(business, "company_name", None),
            "email": lead.email,
        } if business else None,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def _recipient_detail(recipient):
    latest_attribution = (
        MarketingAttribution.query.filter_by(recipient_id=recipient.id)
        .order_by(MarketingAttribution.first_seen_at.desc())
        .first()
    )
    converted = (
        MarketingAttribution.query.filter_by(recipient_id=recipient.id)
        .filter(MarketingAttribution.converted_at.isnot(None))
        .order_by(MarketingAttribution.converted_at.desc())
        .first()
    )
    business = BusinessAccount.query.get(converted.business_account_id) if converted and converted.business_account_id else None

    return {
        "id": recipient.id,
        "campaign_id": recipient.campaign_id,
        "email": recipient.email,
        "first_name": recipient.first_name,
        "last_name": None,
        "company_name": recipient.company_name,
        "job_title": None,
        "city": None,
        "resend_email_id": recipient.resend_email_id,
        "delivered_at": recipient.delivered_at.isoformat() if recipient.delivered_at else None,
        "opened_at": recipient.opened_at.isoformat() if recipient.opened_at else None,
        "clicked_at": recipient.clicked_at.isoformat() if recipient.clicked_at else None,
        "bounced_at": recipient.bounced_at.isoformat() if recipient.bounced_at else None,
        "complained_at": recipient.complained_at.isoformat() if recipient.complained_at else None,
        "utm_content_clicked": latest_attribution.utm_content if latest_attribution else None,
        "signup_status": "converted" if converted else "not_converted",
        "linked_business_account": {
            "id": business.id,
            "user_id": business.owner_user_id,
            "name": getattr(business, "company_name", None),
            "email": converted.email,
        } if business else None,
        "created_at": recipient.created_at.isoformat() if recipient.created_at else None,
    }


def _lead_detail(lead):
    return {
        "id": lead.id,
        "email": lead.email,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "company_name": lead.company_name,
        "job_title": lead.job_title,
        "city": lead.city,
        "campaign": lead.campaign,
        "resend_contact_id": lead.resend_contact_id,
        "converted_at": lead.converted_at.isoformat() if lead.converted_at else None,
        "paid_at": lead.paid_at.isoformat() if lead.paid_at else None,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def _attribution_detail(item):
    return {
        "id": item.id,
        "business_account_id": item.business_account_id,
        "user_id": item.user_id,
        "email": item.email,
        "utm_source": item.utm_source,
        "utm_medium": item.utm_medium,
        "utm_campaign": item.utm_campaign,
        "utm_content": item.utm_content,
        "landing_path": item.landing_path,
        "first_seen_at": item.first_seen_at.isoformat() if item.first_seen_at else None,
        "converted_at": item.converted_at.isoformat() if item.converted_at else None,
        "campaign_id": item.campaign_id,
        "recipient_id": item.recipient_id,
        "campaign_name": item.campaign.name if item.campaign else None,
    }
