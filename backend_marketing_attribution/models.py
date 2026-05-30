from datetime import datetime

from your_app.extensions import db


class MarketingEmailCampaign(db.Model):
    __tablename__ = "marketing_email_campaigns"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(120), nullable=False, unique=True, index=True)
    subject = db.Column(db.String(255), nullable=True)
    resend_audience_id = db.Column(db.String(255), nullable=True, index=True)
    resend_broadcast_id = db.Column(db.String(255), nullable=True, index=True)
    delivered_count_cache = db.Column(db.Integer, nullable=True)
    open_count_cache = db.Column(db.Integer, nullable=True)
    click_count_cache = db.Column(db.Integer, nullable=True)
    bounce_count_cache = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)

    recipients = db.relationship(
        "MarketingEmailRecipient",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
    attributions = db.relationship("MarketingAttribution", back_populates="campaign")
    campaign_leads = db.relationship(
        "CampaignLead",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class MarketingEmailRecipient(db.Model):
    __tablename__ = "marketing_email_recipients"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer,
        db.ForeignKey("marketing_email_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email = db.Column(db.String(255), nullable=False, index=True)
    first_name = db.Column(db.String(120), nullable=True)
    company_name = db.Column(db.String(255), nullable=True)
    resend_email_id = db.Column(db.String(255), nullable=True, unique=True, index=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    opened_at = db.Column(db.DateTime, nullable=True)
    clicked_at = db.Column(db.DateTime, nullable=True)
    bounced_at = db.Column(db.DateTime, nullable=True)
    complained_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    campaign = db.relationship("MarketingEmailCampaign", back_populates="recipients")
    attributions = db.relationship("MarketingAttribution", back_populates="recipient")


class MarketingAttribution(db.Model):
    __tablename__ = "marketing_attributions"

    id = db.Column(db.Integer, primary_key=True)
    business_account_id = db.Column(db.Integer, db.ForeignKey("business_accounts.id"), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    utm_source = db.Column(db.String(120), nullable=False)
    utm_medium = db.Column(db.String(120), nullable=False)
    utm_campaign = db.Column(db.String(120), nullable=False, index=True)
    utm_content = db.Column(db.String(120), nullable=False)
    landing_path = db.Column(db.String(500), nullable=True)
    first_seen_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    converted_at = db.Column(db.DateTime, nullable=True, index=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("marketing_email_campaigns.id"), nullable=True, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("marketing_email_recipients.id"), nullable=True, index=True)

    campaign = db.relationship("MarketingEmailCampaign", back_populates="attributions")
    recipient = db.relationship("MarketingEmailRecipient", back_populates="attributions")


class MarketingLead(db.Model):
    __tablename__ = "marketing_leads"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    first_name = db.Column(db.String(120), nullable=True)
    last_name = db.Column(db.String(120), nullable=True)
    company_name = db.Column(db.String(255), nullable=True)
    job_title = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    campaign = db.Column(db.String(120), nullable=True, index=True)
    resend_contact_id = db.Column(db.String(255), nullable=True, index=True)
    business_account_id = db.Column(db.Integer, db.ForeignKey("business_accounts.id"), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    converted_at = db.Column(db.DateTime, nullable=True, index=True)
    paid_at = db.Column(db.DateTime, nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign_leads = db.relationship(
        "CampaignLead",
        back_populates="lead",
        cascade="all, delete-orphan",
    )


class CampaignLead(db.Model):
    __tablename__ = "campaign_leads"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer,
        db.ForeignKey("marketing_email_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lead_id = db.Column(
        db.Integer,
        db.ForeignKey("marketing_leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    campaign = db.relationship("MarketingEmailCampaign", back_populates="campaign_leads")
    lead = db.relationship("MarketingLead", back_populates="campaign_leads")

    __table_args__ = (
        db.UniqueConstraint("campaign_id", "lead_id", name="uq_campaign_leads_campaign_id_lead_id"),
    )
