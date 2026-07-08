# NGS-Contractor-Doc-Parser (AWS Lambda)

Parses contractor documents (licenses, insurance certificates) with **AWS
Textract** and writes the results back to the GoHighLevel (GHL / LeadConnector)
CRM. Triggered by the **Contractor Vetting** GHL workflow via API Gateway.

This directory is the **source of record** for the function. The function is
deployed and run on AWS; this repo is not wired to auto-deploy it (see Deploy).

## Deployment

| | |
|---|---|
| Function name | `NGS-Contractor-Doc-Parser` |
| Region | `us-east-2` |
| Runtime | Python 3.12 (zip) |
| API Gateway | `https://46lqeybjm1.execute-api.us-east-2.amazonaws.com/default/NGS-Contractor-Doc-Parser` |

### Environment variables (set in the Lambda console — never commit values)
- `CRM_API_KEY` — GHL private integration / API token (Bearer)
- `CRM_LOC_ID` — GHL location id

## Input

```json
{ "contactId": "<ghl-contact-id>", "documentUrl": "<downloadable-doc-url>" }
```

## What it writes back to GHL

1. A **note** on the contact summarizing the parsed fields (license #, insurance
   policy #, expiration, coverage) plus the prevailing-wage result.
2. Two **custom fields** on the contact (PUT `/contacts/{id}`):

   | Field | GHL field id | Type | Values |
   |---|---|---|---|
   | Prevailing_Wage_Flag | `pSVQNzZSx8ry3TXTb4vO` | CHECKBOX | `true` / `false` |
   | Prevailing_Wage_Source | `Fq8mTG6YcCJmcGP4cYO3` | TEXT | `keyword_match` / `none` |

## Prevailing-wage detection

`detect_prevailing_wage()` scans the Textract output for government /
public-funding keywords (word-boundary, case-insensitive). Any match sets the
flag `true` with source `keyword_match`; otherwise `false` / `none`. The keyword
list is `PREVAILING_WAGE_KEYWORDS` in `lambda_function.py`.

## Deploy

The console inline editor is the current deploy path: paste `lambda_function.py`
into the function's `lambda_function.py`, then click **Deploy**. To script it
instead:

```bash
cd lambda/ngs-contractor-doc-parser
zip function.zip lambda_function.py
aws lambda update-function-code \
  --function-name NGS-Contractor-Doc-Parser \
  --zip-file fileb://function.zip \
  --region us-east-2
```

## Verify

1. Trigger with a document containing "Township" → flag `true`, source
   `keyword_match`; contact checkbox checked.
2. Trigger with a private homeowner document (no gov keywords) → flag `false`,
   source `none`; contact checkbox unchecked.

> GHL CHECKBOX note: if the checkbox does not visually check on a `true` write,
> some GHL setups expect the option array form — change the flag line to
> `{'id': PW_FLAG_FIELD_ID, 'value': ['true'] if pw_flag else []}`.
