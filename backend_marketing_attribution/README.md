# Marketing Attribution backend extension

This folder contains the Flask/SQLAlchemy implementation to copy into the API service.
The Flask backend is not present in this workspace, so these files are intentionally isolated
from the Next.js dashboard.

Integration points:

- Add `models.py` classes to the backend model package.
- Run the Alembic migration in `migrations/versions/202606_marketing_attribution.py`.
- Register the blueprint from `routes.py`.
- Call `record_signup_attribution(...)` from the existing `/signup` business user flow after the user and business account are created.
- Use `create_business_launch_campaign(...)` when sending the first Resend campaign.

Resend webhook security:

- Set `RESEND_WEBHOOK_SECRET` to the webhook signing secret from Resend.
- Verify against the raw Flask request body before parsing JSON.
- Resend documents webhook verification using Svix headers and the configured webhook secret.

