# tools/

Scripts the agents are allowed to call.

- `outreach_mailer.py` — reads a spreadsheet, generates per-recipient draft
  emails, optional SMTP send. **Drop your existing copy here.**

## Rules

- A script that can send must default to draft-only. Sending requires an
  explicit flag AND session approval.
- Every send appends a row to `data/outreach.csv`.
- Credentials come from `.env`. Never hardcode, never commit.
