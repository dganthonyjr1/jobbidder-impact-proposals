# NGS_Contractor_Vetting (AWS Lambda)

Orchestration/qualification step in the **Contractor Vetting** GHL workflow. It
stamps a vetting status/notes onto the GHL contact. It does **not** parse
documents — document parsing (and the prevailing-wage detection) lives in the
sibling function [`ngs-contractor-doc-parser`](../ngs-contractor-doc-parser/).

This directory is the **source of record**. The function runs on AWS; this repo
does not auto-deploy it (see Deploy).

## Deployment

| | |
|---|---|
| Function name | `NGS_Contractor_Vetting` |
| Region | `us-east-2` |
| Runtime | Python 3.12 (zip) |

### Environment variables (set in the Lambda console — never commit values)
- `CRM_API_KEY` — GHL API token (Bearer)
- `CRM_API_BASE_URL` — defaults to `https://rest.gohighlevel.com/v1`

## Input

```json
{ "contact_id": "<ghl-contact-id>" }
```

## Known notes / tech debt

- **Uses the legacy GHL v1 API** (`rest.gohighlevel.com/v1`) with the
  object-style `customFields` (`{ "field_key": "value" }`). This differs from
  Doc-Parser, which is on GHL v2 (`services.leadconnectorhq.com`) with the
  array-style `customFields` (`[{ "id", "value" }]`). GHL is sunsetting v1;
  migrating this function to v2 someday is worthwhile.
- Prevailing-wage custom fields are written by **Doc-Parser only** (they are v2
  fields keyed by id, incompatible with this function's v1 format). No
  prevailing-wage logic belongs here.
- The `textract` client is initialized but unused — dead code.

## Deploy

```bash
cd lambda/ngs-contractor-vetting
zip function.zip lambda_function.py
aws lambda update-function-code \
  --function-name NGS_Contractor_Vetting \
  --zip-file fileb://function.zip \
  --region us-east-2
```
