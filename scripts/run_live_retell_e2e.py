import argparse
import json
import pathlib
import sys
import time
from typing import Iterable

import requests

BASE = "https://bidpilot.suddenimpactagency.io"
CONTRACTOR_ID = "990c1ae6-b97a-44b8-a84f-283aeeaccbb6"
DEFAULT_RECIPIENT_EMAIL = "don@suddenimpactagency.io"
LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "pt": "Portuguese",
    "ht": "Haitian Creole",
}

DEFAULT_JOB = {
    "client_name": "Email Only Test",
    "job_address": "123 Test St",
    "job_city": "Orlando",
    "job_state": "FL",
    "trade_type": "roofing",
    "job_description": "Replace wind-damaged asphalt shingles on the front slope, inspect and reseal flashing around roof penetrations, replace three damaged pipe boots, verify underlayment condition, haul away roofing debris, and perform a final water-shedding inspection for a single-family residential roof.",
    "job_scope": "Residential roofing repair and maintenance for a shingle roof in Orlando, Florida. Include materials, labor, cleanup, warranty, exclusions, and a practical timeline.",
}

TRANSCRIPT = (
    "Caller requested a roofing repair estimate and proposal for a single-family home in Orlando, FL. "
    "The work includes replacing damaged shingles, checking flashing, replacing pipe boots, cleanup, and final inspection."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a live Retell webhook smoke test. By default this sends ONE email-only proposal "
            "for ONE selected language/document scenario and explicitly suppresses SMS."
        )
    )
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--contractor-id", default=CONTRACTOR_ID)
    parser.add_argument("--recipient-email", default=DEFAULT_RECIPIENT_EMAIL)
    parser.add_argument("--recipient-phone", default="", help="Only used when --send-sms is supplied.")
    parser.add_argument("--send-sms", action="store_true", help="Opt in to one real SMS for the selected scenario. Omit this for email-only testing.")
    parser.add_argument("--client-name", default=DEFAULT_JOB["client_name"])
    parser.add_argument("--language", choices=sorted(LANGUAGES), default="en")
    parser.add_argument("--all-languages", action="store_true", help="Run every language. Requires --confirm-multiple-delivery because it can send one notification per language.")
    parser.add_argument("--document-type", choices=["proposal", "estimate"], default="proposal")
    parser.add_argument("--both-document-types", action="store_true", help="Run proposal and estimate. Requires --confirm-multiple-delivery because it can send more than one notification.")
    parser.add_argument("--confirm-multiple-delivery", action="store_true", help="Required guardrail for any run that can send more than one email/SMS notification.")
    parser.add_argument("--timeout", type=int, default=90)
    parser.add_argument("--gap-seconds", type=float, default=2.0)
    return parser.parse_args()


def scenario_matrix(args: argparse.Namespace) -> list[tuple[str, str, str]]:
    languages: Iterable[str] = LANGUAGES.keys() if args.all_languages else [args.language]
    doc_types: Iterable[str] = ["proposal", "estimate"] if args.both_document_types else [args.document_type]
    scenarios = [(doc_type, code, LANGUAGES[code]) for doc_type in doc_types for code in languages]
    if len(scenarios) > 1 and not args.confirm_multiple_delivery:
        print(
            "Refusing to run multiple live-delivery scenarios. This would create one notification per scenario. "
            "Use --language <code> and --document-type <proposal|estimate> for a single delivery, or add "
            "--confirm-multiple-delivery if you intentionally want multiple live notifications.",
            file=sys.stderr,
        )
        sys.exit(2)
    if args.send_sms and not args.recipient_phone:
        print("Refusing to send SMS without --recipient-phone.", file=sys.stderr)
        sys.exit(2)
    return scenarios


def build_payload(args: argparse.Namespace, doc_type: str, code: str, name: str) -> dict:
    client_name = f"{args.client_name} {name} {doc_type.title()}"
    job = {
        **DEFAULT_JOB,
        "client_name": client_name,
        "email": args.recipient_email,
    }
    if args.send_sms:
        job["phone"] = args.recipient_phone
    else:
        job["skip_sms"] = True
        job["delivery_mode"] = "email_only"

    call = {
        "to_number": "+14075550100",
        "transcript": TRANSCRIPT.replace("Caller", client_name),
        "call_analysis": {
            "custom_analysis_data": {
                **job,
                "caller_name": client_name,
                "language": code,
                "document_type": doc_type,
            }
        },
    }
    if args.send_sms:
        call["from_number"] = args.recipient_phone
    return {
        "event": "call_analyzed",
        "delivery_mode": "sms" if args.send_sms else "email_only",
        "call": call,
    }


def main() -> None:
    args = parse_args()
    scenarios = scenario_matrix(args)
    out_dir = pathlib.Path(__file__).resolve().parents[1] / "test-results"
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []

    session = requests.Session()
    url = f"{args.base}/api/public/webhook/retell?contractor={args.contractor_id}"

    print(
        json.dumps(
            {
                "delivery_guardrail": "single-scenario by default; SMS suppressed unless --send-sms is supplied",
                "scenario_count": len(scenarios),
                "recipient_email": args.recipient_email,
                "recipient_phone": args.recipient_phone if args.send_sms else None,
                "send_sms": args.send_sms,
                "note": "Default owner/test run is email-only. Production Retell calls are unaffected unless they send delivery_mode=email_only or skip_sms=true.",
            },
            ensure_ascii=False,
        )
    )

    for i, (doc_type, code, name) in enumerate(scenarios, start=1):
        payload = build_payload(args, doc_type, code, name)
        started = time.time()
        record = {
            "scenario_index": i,
            "document_type": doc_type,
            "language": code,
            "language_name": name,
            "request_url": url,
            "payload": payload,
        }
        try:
            r = session.post(url, json=payload, timeout=args.timeout)
            elapsed = round(time.time() - started, 2)
            record.update({"status_code": r.status_code, "elapsed_seconds": elapsed})
            try:
                record["response"] = r.json()
            except Exception:
                record["response_text"] = r.text[:2000]
        except Exception as e:
            record.update({"status_code": None, "error": str(e), "elapsed_seconds": round(time.time() - started, 2)})
        results.append(record)
        response = record.get("response") or {}
        print(
            json.dumps(
                {
                    "index": i,
                    "document_type": doc_type,
                    "language": code,
                    "status_code": record.get("status_code"),
                    "elapsed_seconds": record.get("elapsed_seconds"),
                    "ok": response.get("ok"),
                    "url": response.get("proposal_url") or response.get("estimate_url"),
                    "email": response.get("email"),
                    "sms": response.get("sms"),
                    "ai_error": response.get("ai_error"),
                    "generation_warning": response.get("generation_warning"),
                },
                ensure_ascii=False,
            )
        )
        if i < len(scenarios):
            time.sleep(args.gap_seconds)

    summary = {
        "base": args.base,
        "contractor_id": args.contractor_id,
        "recipient_email": args.recipient_email,
        "recipient_phone": args.recipient_phone if args.send_sms else None,
        "send_sms": args.send_sms,
        "scenario_count": len(results),
        "single_delivery_guardrail": len(results) == 1,
        "success_count": sum(1 for x in results if x.get("status_code") == 200 and (x.get("response") or {}).get("ok") is True),
        "results": results,
    }
    path = out_dir / f"live_retell_e2e_{int(time.time())}.json"
    path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    latest = out_dir / "live_retell_e2e_latest.json"
    latest.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print("RESULT_FILE", latest)


if __name__ == "__main__":
    main()
