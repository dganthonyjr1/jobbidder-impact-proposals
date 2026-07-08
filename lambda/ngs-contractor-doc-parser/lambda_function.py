import json
import os
import boto3
import urllib.request
import re

# Environment variables
CRM_API_KEY = os.environ.get('CRM_API_KEY')
CRM_LOC_ID = os.environ.get('CRM_LOC_ID')
CRM_BASE_URL = 'https://services.leadconnectorhq.com'

# Prevailing-wage custom field IDs (created in GHL 2026-07-08)
PW_FLAG_FIELD_ID = 'pSVQNzZSx8ry3TXTb4vO'      # CHECKBOX
PW_SOURCE_FIELD_ID = 'Fq8mTG6YcCJmcGP4cYO3'    # TEXT

# Government / public-funding keywords that imply prevailing wage
PREVAILING_WAGE_KEYWORDS = [
    'township', 'municipal', 'municipality', 'city of', 'county', 'borough',
    'authority', 'district', 'department of', 'dot', 'school district',
    'government', 'federal', 'state of', 'public works', 'hud',
    'housing authority', 'county-funded', 'state-funded', 'publicly funded',
    'grant funded', 'federally funded', 'public project', 'government contract',
    'tax-funded',
]
# Word-boundary, case-insensitive match so "dot" doesn't hit inside other words
_PW_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(k) for k in PREVAILING_WAGE_KEYWORDS) + r')\b',
    re.IGNORECASE,
)

# Initialize Textract client
textract_client = boto3.client('textract', region_name='us-east-2')


def lambda_handler(event, context):
    try:
        # Parse incoming payload
        body = event
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])

        contact_id = body.get('contactId')
        doc_url = body.get('documentUrl')

        if not contact_id or not doc_url:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing contactId or documentUrl'})
            }

        # Download the document
        doc_bytes = download_document(doc_url)

        # Extract text using Textract
        extracted_text = extract_text_with_textract(doc_bytes)

        # Parse contractor info from text
        parsed_data = parse_contractor_info(extracted_text)

        # Update CRM contact with a note + prevailing-wage custom fields
        update_result = update_crm_contact(contact_id, parsed_data)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'contactId': contact_id,
                'parsedData': parsed_data,
                'crmUpdate': update_result
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def download_document(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def extract_text_with_textract(doc_bytes):
    response = textract_client.detect_document_text(
        Document={'Bytes': doc_bytes}
    )
    lines = [
        block['Text']
        for block in response.get('Blocks', [])
        if block['BlockType'] == 'LINE'
    ]
    return '\n'.join(lines)


def detect_prevailing_wage(text):
    """Return (flag, source) based on government/public-funding keywords."""
    match = _PW_PATTERN.search(text or '')
    if match:
        print(f'Prevailing wage keyword matched: "{match.group(0)}"')
        return True, 'keyword_match'
    return False, 'none'


def _date_key(d):
    """Sort key (year, month, day) for an MM/DD/YYYY date string."""
    p = re.split(r'[\/\-]', d)
    return (int(p[2]), int(p[0]), int(p[1]))


def parse_contractor_info(text):
    parsed = {}

    # License number — require the word "license/licence" AND a token that
    # contains a digit, so loose words like "policies" cannot false-positive.
    m = re.search(r'\blicen[sc]e\s*(?:#|no\.?|number)?\s*[:#]?\s*([A-Z]{0,3}-?\d[A-Z0-9\-]{2,})', text, re.IGNORECASE)
    if m:
        parsed['licenseNumber'] = m.group(1).strip()

    # Insurance policy number — require a "policy" label (#/no/number) and a
    # value containing a digit (rejects "policy provisions", etc.).
    m = re.search(r'\bpolicy\s*(?:#|no\.?|number)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{4,})', text, re.IGNORECASE)
    if m and re.search(r'\d', m.group(1)):
        parsed['insurancePolicyNumber'] = m.group(1).strip()

    # Expiration date — a labeled date if present, else the latest date on the
    # document (on a certificate the newest date is the expiration).
    m = re.search(r'(?:expir\w*|valid\s*(?:through|until|to))\D{0,15}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})', text, re.IGNORECASE)
    if m:
        parsed['expirationDate'] = m.group(1)
    else:
        dates = re.findall(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b', text)
        if dates:
            parsed['expirationDate'] = max(dates, key=_date_key)

    # Coverage amount — the largest comma-formatted currency figure on the doc.
    amounts = re.findall(r'\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)', text)
    if amounts:
        parsed['coverageAmount'] = '$' + max(amounts, key=lambda s: float(s.replace(',', '')))

    # Prevailing-wage detection (government / public-funding keywords)
    pw_flag, pw_source = detect_prevailing_wage(text)
    parsed['prevailingWageFlag'] = pw_flag
    parsed['prevailingWageSource'] = pw_source

    # Store raw text (first 2000 chars)
    parsed['extractedText'] = text[:2000]

    return parsed


def update_crm_contact(contact_id, parsed_data):
    headers = {
        'Authorization': f'Bearer {CRM_API_KEY}',
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
    }

    # 1) Create the results note
    note_body = 'Document Parser Results\n\n'
    if parsed_data.get('licenseNumber'):
        note_body += f"License #: {parsed_data['licenseNumber']}\n"
    if parsed_data.get('insurancePolicyNumber'):
        note_body += f"Insurance Policy #: {parsed_data['insurancePolicyNumber']}\n"
    if parsed_data.get('expirationDate'):
        note_body += f"Expiration: {parsed_data['expirationDate']}\n"
    if parsed_data.get('coverageAmount'):
        note_body += f"Coverage: {parsed_data['coverageAmount']}\n"
    note_body += f"Prevailing Wage: {parsed_data.get('prevailingWageFlag')} ({parsed_data.get('prevailingWageSource')})\n"
    note_body += f"\n---\nExtracted Text (preview):\n{parsed_data.get('extractedText', '')[:500]}"

    note_result = {'noteCreated': False}
    note_url = f'{CRM_BASE_URL}/contacts/{contact_id}/notes'
    note_payload = json.dumps({'body': note_body}).encode('utf-8')
    try:
        req = urllib.request.Request(note_url, data=note_payload, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read())
            note_result = {'noteCreated': True, 'noteId': result.get('note', {}).get('id')}
    except Exception as e:
        print(f'CRM note error: {str(e)}')
        note_result = {'noteCreated': False, 'error': str(e)}

    # 2) Write prevailing-wage custom fields onto the contact (PUT)
    field_result = update_crm_custom_fields(
        contact_id,
        headers,
        parsed_data.get('prevailingWageFlag', False),
        parsed_data.get('prevailingWageSource', 'none'),
    )

    return {'note': note_result, 'customFields': field_result}


def update_crm_custom_fields(contact_id, headers, pw_flag, pw_source):
    put_url = f'{CRM_BASE_URL}/contacts/{contact_id}'
    payload = json.dumps({
        'customFields': [
            {'id': PW_FLAG_FIELD_ID, 'value': pw_flag},
            {'id': PW_SOURCE_FIELD_ID, 'value': pw_source},
        ]
    }).encode('utf-8')
    try:
        req = urllib.request.Request(put_url, data=payload, headers=headers, method='PUT')
        with urllib.request.urlopen(req, timeout=15) as response:
            json.loads(response.read())
            print(f'Custom fields updated: flag={pw_flag}, source={pw_source}')
            return {'customFieldsUpdated': True}
    except Exception as e:
        print(f'CRM custom field update error: {str(e)}')
        return {'customFieldsUpdated': False, 'error': str(e)}
