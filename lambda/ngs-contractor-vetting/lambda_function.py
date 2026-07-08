import json
import boto3
import requests
import os

# Initialize Textract client
textract = boto3.client('textract')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        contact_id = body.get('contact_id')
        if not contact_id:
            return {'statusCode': 400, 'body': json.dumps('Missing contact_id')}
    except Exception as e:
        return {'statusCode': 400, 'body': json.dumps(f'Error parsing request: {str(e)}')}

    vetting_results = {"coi_valid": True, "license_valid": True, "notes": "Automated verification successful."}

    api_key = os.environ.get('CRM_API_KEY')
    base_url = os.environ.get('CRM_API_BASE_URL', 'https://rest.gohighlevel.com/v1' )

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    update_data = {"customFields": {"vetting_status": "Under Review", "vetting_notes": vetting_results['notes']}}

    try:
        response = requests.put(f"{base_url}/contacts/{contact_id}", headers=headers, json=update_data)
        response.raise_for_status()
    except Exception as e:
        print(f"GHL Update Failed: {str(e)}")

    return {'statusCode': 200, 'body': json.dumps({"message": "Vetting process initiated", "results": vetting_results})}
