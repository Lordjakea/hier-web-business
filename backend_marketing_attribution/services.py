import os
import re
from datetime import datetime

import requests

from your_app.extensions import db
from your_app.models import (
    CampaignLead,
    MarketingAttribution,
    MarketingEmailCampaign,
    MarketingEmailRecipient,
    MarketingLead,
)


BUSINESS_LAUNCH_SLUG = "business_launch_june"
RESEND_API_BASE = "https://api.resend.com"


def slug_to_name(slug):
    return " ".join(part.capitalize() for part in slug.split("_") if part)


def _resend_headers():
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def get_or_create_campaign(slug, name=None, audience_id=None):
    normalized_slug = (slug or "").strip().lower()
    if not normalized_slug:
        return None

    campaign = MarketingEmailCampaign.query.filter_by(slug=normalized_slug).first()
    if campaign:
        if audience_id and not campaign.resend_audience_id:
            campaign.resend_audience_id = audience_id
        return campaign

    campaign = MarketingEmailCampaign(
        name=name or slug_to_name(normalized_slug),
        slug=normalized_slug,
        resend_audience_id=audience_id,
    )
    db.session.add(campaign)
    db.session.flush()
    return campaign


def sync_resend_contact(lead, audience_id=None):
    properties = {
        "company_name": lead.company_name or "",
        "job_title": lead.job_title or "",
        "city": lead.city or "",
        "campaign": lead.campaign or "",
    }
    payload = {
        "email": lead.email,
        "first_name": lead.first_name or "",
        "last_name": lead.last_name or "",
        "unsubscribed": False,
        "properties": properties,
    }
    if audience_id:
        payload["audience_id"] = audience_id

    contact_ref = lead.resend_contact_id or lead.email
    method = requests.patch if lead.resend_contact_id else requests.post
    url = f"{RESEND_API_BASE}/contacts/{contact_ref}" if lead.resend_contact_id else f"{RESEND_API_BASE}/contacts"
    response = method(url, json=payload, headers=_resend_headers(), timeout=20)

    if response.status_code == 404 and lead.resend_contact_id:
        response = requests.post(f"{RESEND_API_BASE}/contacts", json=payload, headers=_resend_headers(), timeout=20)
    if response.status_code == 409:
        response = requests.patch(f"{RESEND_API_BASE}/contacts/{lead.email}", json=payload, headers=_resend_headers(), timeout=20)

    response.raise_for_status()
    data = response.json()
    lead.resend_contact_id = data.get("id") or data.get("data", {}).get("id") or lead.resend_contact_id
    return lead.resend_contact_id


def import_marketing_leads(rows, sync_contacts=True):
    imported = 0
    updated = 0
    skipped = 0
    errors = []
    leads = []

    for index, row in enumerate(rows, start=1):
        email = (row.get("email") or "").strip().lower()
        if not email:
            skipped += 1
            errors.append({"row": index, "email": None, "error": "Missing email"})
            continue
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            skipped += 1
            errors.append({"row": index, "email": email, "error": "Invalid email"})
            continue

        lead = MarketingLead.query.filter_by(email=email).first()
        is_new = lead is None
        if not lead:
            lead = MarketingLead(email=email)
            db.session.add(lead)

        for field in ["first_name", "last_name", "company_name", "job_title", "city", "campaign"]:
            value = (row.get(field) or "").strip()
            if value:
                setattr(lead, field, value)

        campaign = get_or_create_campaign(lead.campaign) if lead.campaign else None
        db.session.flush()

        if campaign:
            existing_assignment = CampaignLead.query.filter_by(
                campaign_id=campaign.id,
                lead_id=lead.id,
            ).first()
            if not existing_assignment:
                db.session.add(CampaignLead(campaign_id=campaign.id, lead_id=lead.id))

        if sync_contacts:
            try:
                sync_resend_contact(lead, campaign.resend_audience_id if campaign else None)
            except Exception as exc:
                errors.append({"row": index, "email": email, "error": str(exc)})

        imported += 1 if is_new else 0
        updated += 0 if is_new else 1
        leads.append(lead)

    db.session.commit()
    return {
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "leads": leads,
    }


def record_signup_attribution(payload, user=None, business_account=None):
    utm_source = (payload.get("utm_source") or "").strip()
    utm_medium = (payload.get("utm_medium") or "").strip()
    utm_campaign = (payload.get("utm_campaign") or "").strip()
    utm_content = (payload.get("utm_content") or "").strip()

    if not all([utm_source, utm_medium, utm_campaign, utm_content]):
        email = (payload.get("email") or getattr(user, "email", None) or "").strip().lower()
        return link_marketing_lead_conversion(email, user=user, business_account=business_account)

    email = (payload.get("email") or getattr(user, "email", None) or "").strip().lower()
    campaign = MarketingEmailCampaign.query.filter_by(slug=utm_campaign).first()
    recipient = None

    if campaign and email:
        recipient = (
            MarketingEmailRecipient.query.filter_by(campaign_id=campaign.id, email=email)
            .order_by(MarketingEmailRecipient.created_at.desc())
            .first()
        )

    attribution = (
        MarketingAttribution.query.filter_by(
            email=email or None,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
        )
        .order_by(MarketingAttribution.first_seen_at.asc())
        .first()
    )

    if not attribution:
        attribution = MarketingAttribution(
            email=email or None,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
            landing_path=payload.get("landing_path") or "/signup/business",
            campaign_id=campaign.id if campaign else None,
            recipient_id=recipient.id if recipient else None,
        )
        db.session.add(attribution)

    attribution.user_id = getattr(user, "id", None)
    attribution.business_account_id = getattr(business_account, "id", None)
    attribution.converted_at = attribution.converted_at or datetime.utcnow()
    link_marketing_lead_conversion(
        email,
        user=user,
        business_account=business_account,
        campaign=campaign,
    )

    db.session.flush()
    return attribution


def link_marketing_lead_conversion(email, user=None, business_account=None, campaign=None):
    if not email:
        return None

    lead = MarketingLead.query.filter_by(email=email.strip().lower()).first()
    if not lead:
        return None

    lead.user_id = getattr(user, "id", None) or lead.user_id
    lead.business_account_id = getattr(business_account, "id", None) or lead.business_account_id
    lead.converted_at = lead.converted_at or datetime.utcnow()

    linked_campaign = campaign or get_or_create_campaign(lead.campaign)
    if linked_campaign:
        existing_assignment = CampaignLead.query.filter_by(
            campaign_id=linked_campaign.id,
            lead_id=lead.id,
        ).first()
        if not existing_assignment:
            db.session.add(CampaignLead(campaign_id=linked_campaign.id, lead_id=lead.id))

    db.session.flush()
    return lead


def mark_paid_business(email=None, business_account=None):
    lead = None
    if email:
        lead = MarketingLead.query.filter_by(email=email.strip().lower()).first()
    if not lead and business_account:
        lead = MarketingLead.query.filter_by(business_account_id=business_account.id).first()
    if not lead:
        return None
    lead.paid_at = lead.paid_at or datetime.utcnow()
    db.session.flush()
    return lead


def sync_resend_campaign_metrics(campaign_id=None):
    campaigns_query = MarketingEmailCampaign.query
    if campaign_id:
        campaigns_query = campaigns_query.filter_by(id=campaign_id)

    synced = 0
    for campaign in campaigns_query.all():
        if not campaign.resend_broadcast_id:
            continue

        response = requests.get(
            f"{RESEND_API_BASE}/broadcasts/{campaign.resend_broadcast_id}",
            headers=_resend_headers(),
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        metrics = data.get("metrics") or data.get("data", {}).get("metrics") or {}

        campaign.delivered_count_cache = metrics.get("delivered")
        campaign.open_count_cache = metrics.get("opened") or metrics.get("opens")
        campaign.click_count_cache = metrics.get("clicked") or metrics.get("clicks")
        campaign.bounce_count_cache = metrics.get("bounced") or metrics.get("bounces")
        synced += 1

    db.session.commit()
    return synced


def create_business_launch_campaign(recipients, subject, resend_client):
    campaign = MarketingEmailCampaign.query.filter_by(slug=BUSINESS_LAUNCH_SLUG).first()
    if not campaign:
        campaign = MarketingEmailCampaign(
            name="Business Launch June",
            slug=BUSINESS_LAUNCH_SLUG,
            subject=subject,
        )
        db.session.add(campaign)
        db.session.flush()

    for item in recipients:
        email = item["email"].strip().lower()
        recipient = MarketingEmailRecipient(
            campaign_id=campaign.id,
            email=email,
            first_name=item.get("first_name"),
            company_name=item.get("company_name"),
        )
        db.session.add(recipient)
        db.session.flush()

        response = resend_client.emails.send(
            {
                "from": item["from"],
                "to": [email],
                "subject": subject,
                "html": item["html"],
            }
        )
        recipient.resend_email_id = response.get("id") or response.get("email_id")

    campaign.sent_at = datetime.utcnow()
    db.session.commit()
    return campaign
