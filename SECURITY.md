# JOBBIDDER.IO SECURITY AND PROPRIETARY NOTICE

**Classification:** CONFIDENTIAL - PROPRIETARY  
**Last Updated:** June 23, 2026  
**Version:** 1.0

---

## PROPRIETARY NOTICE

This repository contains proprietary and confidential information of [Your Company Name], including:

- Trade secrets
- Proprietary algorithms
- Confidential business logic
- Patent-pending technology

**Unauthorized access, use, reproduction, or distribution is strictly prohibited.**

---

## PATENT PROTECTION

**Provisional Patent Application Filed:** June 23, 2026

**Title:** System and Method for Automated Contractor Discovery, Compliance Vetting, Pre-Qualification, and Hiring Execution

**Protected Elements:**
- Four-phase contractor automation workflow
- Compliance verification algorithm
- Pre-qualification scoring system
- Contractor matching logic
- Proposal generation system
- Hiring execution workflow

---

## PROPRIETARY ALGORITHMS

### 1. Contractor Pre-Qualification Scoring Algorithm

**File:** `src/lib/contractor-scoring.ts`

**Classification:** PROPRIETARY - TRADE SECRET

**Description:** Automated scoring algorithm for assessing contractor technical capabilities based on NGS-specific criteria. Scoring rubric includes:

- Years in operation (0-20 points)
- Commercial glazing experience (0-20 points)
- Average project size (0-20 points)
- Window film experience (0-10 points)
- Crew size (0-10 points)
- States licensed in (Manual Review)
- OSHA/Safety record (0-10 points)
- Availability (0-10 points)
- Surety Bond status (0-10 points)
- Workers' Comp insurance (0-10 points)

**Threshold:** 70+ points = Pre-Qualified

**Protection:** This algorithm is specific to NGS's requirements and represents accumulated business knowledge. Unauthorized disclosure is prohibited.

---

### 2. Compliance Verification Algorithm

**File:** `src/lib/ghl.server.ts`, `src/lib/compliance-verification.ts`

**Classification:** PROPRIETARY - TRADE SECRET

**Description:** Automated verification of contractor compliance with state-specific requirements including:

- Insurance coverage verification (minimum thresholds by state)
- License verification (state licensing board integration)
- Workers' compensation verification
- Surety bond verification
- Expiration date tracking and renewal requests

**State-Specific Rules:**
- California: $1M GL, CSLB license, $15K surety
- Nevada: $500K GL, CCOB license, $10K surety
- Arizona: $1M GL, RCAC license, $20K surety
- Texas: $1M GL, no state license, $15K surety

**Protection:** This logic encodes NGS's specific compliance requirements and represents proprietary business knowledge. Unauthorized disclosure is prohibited.

---

### 3. Contractor Matching Algorithm

**File:** `src/lib/contractors.functions.ts`

**Classification:** PROPRIETARY - TRADE SECRET

**Description:** Automated matching of pre-qualified contractors to projects based on:

- Geographic proximity scoring
- Specialty skill matching
- Capacity assessment
- Compliance status verification
- Historical performance scoring

**Protection:** This algorithm is specific to NGS's hiring preferences and represents proprietary business knowledge. Unauthorized disclosure is prohibited.

---

### 4. Multi-Tier Proposal Generation Logic

**File:** `src/lib/proposals.functions.ts`

**Classification:** PROPRIETARY - TRADE SECRET

**Description:** Automated generation of Good/Better/Best proposal tiers including:

- Scope of work generation (by project type)
- Material list generation (by scope)
- Labor estimate calculation (by contractor capacity)
- Timeline estimation (by project complexity)

**Protection:** This logic encodes NGS's proposal standards and pricing models. Unauthorized disclosure is prohibited.

---

## CONFIDENTIAL BUSINESS LOGIC

### GHL Integration Workflow

**File:** `src/routes/api/public/webhook.ghl-contractor-survey.tsx`

**Classification:** CONFIDENTIAL

**Description:** Custom GHL workflow integration for contractor intake, survey completion, and data synchronization. This integration is specific to NGS's business processes and represents proprietary workflow logic.

**Protection:** Unauthorized modification or disclosure is prohibited.

---

### Contractor Performance Tracking

**File:** `src/lib/contractor-performance.ts` (planned)

**Classification:** CONFIDENTIAL

**Description:** System for tracking and analyzing contractor performance metrics including acceptance rates, success rates, safety records, and client satisfaction. This data becomes increasingly valuable over time and represents a competitive moat.

**Protection:** Access restricted to authorized personnel only.

---

## ACCESS CONTROLS

### Repository Access

This repository is restricted to authorized employees and contractors of [Your Company Name].

**Access Requirements:**
- GitHub organization membership
- Signed NDA
- Security training completion
- Background check (if required)

**Unauthorized Access:** Unauthorized access attempts will be logged and reported to security team.

---

### Code Review Process

All code changes must go through security review before merging:

1. **Security Review:** Verify no proprietary algorithms are disclosed
2. **Compliance Review:** Verify no confidential business logic is exposed
3. **Patent Review:** Verify no patent-pending technology is disclosed
4. **Approval:** Authorized reviewer must approve before merge

---

### Deployment Controls

Deployments to production require:

1. **Security Sign-off:** Verify no vulnerabilities introduced
2. **Compliance Sign-off:** Verify no confidential data exposed
3. **Audit Trail:** Log all deployments for compliance
4. **Rollback Plan:** Maintain ability to rollback if issues discovered

---

## CONFIDENTIAL DATA

### Do Not Commit

The following must NEVER be committed to this repository:

- API keys or tokens
- Database credentials
- GHL integration secrets
- Contractor performance data
- Client information
- Financial data
- Insurance information
- License information

**Use environment variables for all secrets.**

---

### Sensitive Files

The following files contain sensitive information and require special handling:

- `src/lib/compliance-verification.ts` - Compliance rules
- `src/lib/contractor-scoring.ts` - Scoring algorithm
- `src/routes/api/public/webhook.ghl-contractor-survey.tsx` - GHL integration
- `.env.local` - Secrets (NEVER commit)

---

## INCIDENT REPORTING

If you discover:

- Unauthorized access to this repository
- Disclosure of proprietary information
- Potential security vulnerability
- Suspected IP theft

**Immediately report to:** [Security Contact Email]

---

## LEGAL NOTICES

### Copyright

Copyright © 2026 [Your Company Name]. All rights reserved.

This software and associated documentation files are the exclusive property of [Your Company Name] and are protected by copyright law.

### Trade Secret Protection

The proprietary algorithms and business logic contained in this repository are protected as trade secrets under applicable law. Unauthorized disclosure may result in civil and criminal liability.

### Patent Protection

Provisional Patent Application filed June 23, 2026 for "System and Method for Automated Contractor Discovery, Compliance Vetting, Pre-Qualification, and Hiring Execution."

### License

This Software is licensed solely for use by authorized employees and contractors of [Your Company Name]. Any other use is strictly prohibited.

---

## COMPLIANCE REQUIREMENTS

### Developer Responsibilities

All developers working on this codebase must:

1. **Maintain Confidentiality** - Do not disclose proprietary information
2. **Protect Credentials** - Never commit secrets to repository
3. **Follow Security Guidelines** - Implement security best practices
4. **Report Incidents** - Immediately report any security issues
5. **Complete Training** - Complete security and compliance training

### Audit Trail

All access to this repository is logged and audited for compliance purposes.

---

## QUESTIONS?

If you have questions about security, proprietary protection, or confidentiality requirements:

**Contact:** [Security Contact Email]

---

**CONFIDENTIAL - PROPRIETARY**  
**Distribution: Internal Use Only**  
**Last Updated: June 23, 2026**
