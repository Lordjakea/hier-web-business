"""add marketing attribution tables

Revision ID: 202606_marketing_attribution
Revises:
Create Date: 2026-06-01
"""

from alembic import op
import sqlalchemy as sa


revision = "202606_marketing_attribution"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "marketing_email_campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("resend_audience_id", sa.String(length=255), nullable=True),
        sa.Column("resend_broadcast_id", sa.String(length=255), nullable=True),
        sa.Column("delivered_count_cache", sa.Integer(), nullable=True),
        sa.Column("open_count_cache", sa.Integer(), nullable=True),
        sa.Column("click_count_cache", sa.Integer(), nullable=True),
        sa.Column("bounce_count_cache", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_marketing_email_campaigns_slug", "marketing_email_campaigns", ["slug"])
    op.create_index("ix_marketing_email_campaigns_resend_audience_id", "marketing_email_campaigns", ["resend_audience_id"])
    op.create_index("ix_marketing_email_campaigns_resend_broadcast_id", "marketing_email_campaigns", ["resend_broadcast_id"])

    op.create_table(
        "marketing_email_recipients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=120), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("resend_email_id", sa.String(length=255), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=True),
        sa.Column("clicked_at", sa.DateTime(), nullable=True),
        sa.Column("bounced_at", sa.DateTime(), nullable=True),
        sa.Column("complained_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["campaign_id"], ["marketing_email_campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("resend_email_id"),
    )
    op.create_index("ix_marketing_email_recipients_campaign_id", "marketing_email_recipients", ["campaign_id"])
    op.create_index("ix_marketing_email_recipients_email", "marketing_email_recipients", ["email"])
    op.create_index("ix_marketing_email_recipients_resend_email_id", "marketing_email_recipients", ["resend_email_id"])

    op.create_table(
        "marketing_attributions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_account_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("utm_source", sa.String(length=120), nullable=False),
        sa.Column("utm_medium", sa.String(length=120), nullable=False),
        sa.Column("utm_campaign", sa.String(length=120), nullable=False),
        sa.Column("utm_content", sa.String(length=120), nullable=False),
        sa.Column("landing_path", sa.String(length=500), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("converted_at", sa.DateTime(), nullable=True),
        sa.Column("campaign_id", sa.Integer(), nullable=True),
        sa.Column("recipient_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["business_account_id"], ["business_accounts.id"]),
        sa.ForeignKeyConstraint(["campaign_id"], ["marketing_email_campaigns.id"]),
        sa.ForeignKeyConstraint(["recipient_id"], ["marketing_email_recipients.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_marketing_attributions_business_account_id", "marketing_attributions", ["business_account_id"])
    op.create_index("ix_marketing_attributions_user_id", "marketing_attributions", ["user_id"])
    op.create_index("ix_marketing_attributions_email", "marketing_attributions", ["email"])
    op.create_index("ix_marketing_attributions_utm_campaign", "marketing_attributions", ["utm_campaign"])
    op.create_index("ix_marketing_attributions_converted_at", "marketing_attributions", ["converted_at"])
    op.create_index("ix_marketing_attributions_campaign_id", "marketing_attributions", ["campaign_id"])
    op.create_index("ix_marketing_attributions_recipient_id", "marketing_attributions", ["recipient_id"])

    op.create_table(
        "marketing_leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=120), nullable=True),
        sa.Column("last_name", sa.String(length=120), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("job_title", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("campaign", sa.String(length=120), nullable=True),
        sa.Column("resend_contact_id", sa.String(length=255), nullable=True),
        sa.Column("business_account_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("converted_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["business_account_id"], ["business_accounts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_marketing_leads_email", "marketing_leads", ["email"])
    op.create_index("ix_marketing_leads_campaign", "marketing_leads", ["campaign"])
    op.create_index("ix_marketing_leads_resend_contact_id", "marketing_leads", ["resend_contact_id"])
    op.create_index("ix_marketing_leads_business_account_id", "marketing_leads", ["business_account_id"])
    op.create_index("ix_marketing_leads_user_id", "marketing_leads", ["user_id"])
    op.create_index("ix_marketing_leads_converted_at", "marketing_leads", ["converted_at"])
    op.create_index("ix_marketing_leads_paid_at", "marketing_leads", ["paid_at"])

    op.create_table(
        "campaign_leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["marketing_email_campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["marketing_leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("campaign_id", "lead_id", name="uq_campaign_leads_campaign_id_lead_id"),
    )
    op.create_index("ix_campaign_leads_campaign_id", "campaign_leads", ["campaign_id"])
    op.create_index("ix_campaign_leads_lead_id", "campaign_leads", ["lead_id"])


def downgrade():
    op.drop_table("campaign_leads")
    op.drop_table("marketing_leads")
    op.drop_table("marketing_attributions")
    op.drop_table("marketing_email_recipients")
    op.drop_table("marketing_email_campaigns")
