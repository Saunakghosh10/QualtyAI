# Sandbox.co.in KYC / KYB API: integration spec

Researched 2026-11-21 from the public docs only (no signup, no live or test calls).
Main sources: the docs pages cited in each section, plus the machine-readable specs
`https://developer.sandbox.co.in/api-reference/kyc/openapi.json`,
`https://developer.sandbox.co.in/api-reference/gst/compliance/openapi.json` and
`https://developer.sandbox.co.in/llms-full.txt`.
Anything the docs don't state is marked **UNCONFIRMED**.

Use: a Next.js 16 server route (`web/src/app/api/kyb/...`, Node runtime) that checks an Indian
company before it's onboarded. The keys stay server-side and never reach the client.

---

## 0. Recommended KYB flow for QualtyAI

1. **GSTIN verify** (`POST /gst/compliance/public/gstin/verify`). It's cheap and returns legal name, PAN, status and state. If the user has a full address, use **GSTIN search** (`/gstin/search`) instead, because it also returns `lgnm`, `tradeNam`, `sts`, `ctb` and the address.
2. **Company PAN verify** (`POST /kyc/pan/verify`) with the PAN from GSTIN chars 3–12, the legal name and the date of incorporation. Check that `status = valid`, `category = company`, and `name_as_per_pan_match` / `date_of_birth_match` are true.
3. **CIN / LLPIN lookup** (`POST /kyc/mca/company/master-data`) when the company is registered with MCA. Check that `company_status = Active` and that the name matches.
4. **Bank account verification** (optional, for payouts): penny-drop `GET /bank/{ifsc}/accounts/{account_number}/verify`, or the penny-less variant.

Store `transaction_id` from every response for audit.

---

## 1. Authentication

Sources: https://developer.sandbox.co.in/api-reference/authenticate · https://developer.sandbox.co.in/guides/get-started/quickstart · https://developer.sandbox.co.in/guides/developer-resources/environments

| | Test | Production |
|---|---|---|
| Base URL | `https://test-api.sandbox.co.in` | `https://api.sandbox.co.in` |
| Key prefix | `key_test` (secret `secret_test...`, see note) | `key_live` (secret `secret_live...`) |
| Billing | Free | Billed per plan |
| Rate limit | 25 req/min | 500 req/min |

Note: the secret prefix `secret_live....` comes from the authenticate page example. `secret_test...` is inferred, so it's **UNCONFIRMED**.

**Test environment behaviour:** the test environment returns saved mock examples. A request that doesn't match a saved example returns **404 Not Found** with a detailed message (changelog, in `llms-full.txt`). Use the example inputs below (e.g. PAN `XXXPX1234A`, GSTIN `29AFSPB9500E1ZY`, CIN `U72900GJ2015PTC082637`) in test mode.

### `POST /authenticate`

Headers:

```
x-api-key: key_live_xxx        (required)
x-api-secret: secret_live_xxx  (required)
x-api-version: 1.0.0           (optional; the authenticate page shows "1.0", the quickstart shows "1.0.0")
Content-Type: application/json
```

There's no body. Response 200:

```json
{
  "code": 200,
  "data": { "access_token": "eyJ0e...." },
  "timestamp": 1750687659809,
  "transaction_id": "3a31716a-6a4d-4670-83fe-849d8209e35a"
}
```

- The token is a **JWT valid for 24 hours**. Call `/authenticate` again for a new one. There's no refresh endpoint for this token.
- **Later calls:** send `authorization: <access_token>` with **no `Bearer` prefix** ("NOT a bearer token") **plus** `x-api-key: <key>` on every call.
- Implementation: cache the token in memory or KV with `expiresAt = now + 23h`. On a 403 with an invalid token, re-authenticate once and retry.

Common headers on every data call:

```
authorization: <access_token>
x-api-key: <key>
x-api-version: 1.0.0         (optional; GST endpoints default to "1.0.0")
Content-Type: application/json
x-accept-cache: true|false   (optional, see section 7)
```

---

## 2. PAN verification (individual and company): `POST /kyc/pan/verify`

Source: https://developer.sandbox.co.in/api-reference/kyc/pan/endpoints/verify_pan_details (overview: https://developer.sandbox.co.in/api-reference/kyc/pan/overview)
This endpoint replaces the deprecated "PAN Basic / PAN Advance" APIs (https://developer.sandbox.co.in/changelog/verify-pan-details-api).

One endpoint covers every PAN type. The response field `category` tells you the holder type.

Request (all 6 fields are required and `additionalProperties: false`):

```json
{
  "@entity": "in.co.sandbox.kyc.pan_verification.request",
  "pan": "XXXCX1234B",
  "name_as_per_pan": "Acme Logistics Private Limited",
  "date_of_birth": "19/03/2015",
  "consent": "Y",
  "reason": "KYB verification for supplier onboarding"
}
```

| Field | Rule |
|---|---|
| `@entity` | const `in.co.sandbox.kyc.pan_verification.request` |
| `pan` | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` |
| `name_as_per_pan` | string, min length 2 |
| `date_of_birth` | `DD/MM/YYYY`. For a company, the **date of incorporation**. |
| `consent` | `"Y"` or `"y"` |
| `reason` | string, **min length 20** |

Response 200:

```json
{
  "code": 200,
  "timestamp": 1000000000000,
  "transaction_id": "3b862714-d27d-4907-9027-e6399f8a8d46",
  "data": {
    "@entity": "in.co.sandbox.kyc.pan_verification.response",
    "pan": "XXXPX1234A",
    "category": "individual",
    "status": "valid",
    "status_code": "E",
    "status_description": "Existing and Valid",
    "remarks": null,
    "name_as_per_pan_match": true,
    "date_of_birth_match": true,
    "aadhaar_seeding_status": "y"
  }
}
```

- These fields are always present: `@entity`, `pan`, `category`, `status` (`valid`/`invalid`), `name_as_per_pan_match` (bool), `date_of_birth_match` (bool), `aadhaar_seeding_status` (`y`/`n`/`na`).
- These are optional: `status_code` and `status_description`. `remarks` is deprecated and can be null.
- `category` values seen in the examples: `individual`, `company`, `trust`, `association_of_persons`, `body_of_individuals`. The full enum (e.g. firm, llp, huf, government) is **UNCONFIRMED**.
- **The response never returns the registered name.** It returns only the match booleans.
- `status_code`: valid statuses are `E` (Existing and Valid), `ED` (Death), `EA` (Amalgamation), `EC` (Acquisition), `EI` (Dissolution), `EL` (Liquidated), `EM` (Merger), `EP` (Partition), `ES` (Split) and `EU` (Under Liquidation). Invalid statuses are `F` (Fake), `X` (Deactivated), `D` (Deleted) and `N` (Not in ITD database).
- KYB rule: accept only `status=valid` with `status_code=E`. Flag `EL`, `EU`, `EI`, `EM`, `EA` and `EC` for manual review.
- Company example in the docs: `XXXCX1234B`, which returns `category: company`, `status_code: EM` (Merger) and `aadhaar_seeding_status: na`.

Errors (body `{code, timestamp, message, transaction_id}`):

| HTTP | Meaning / example message |
|---|---|
| 400 | Malformed body, e.g. a missing or wrong `@entity` |
| 401 | Missing Authorization header |
| 403 | Invalid or missing API key, or invalid token |
| 422 | `"Invalid PAN pattern"` (test PAN `XXXPX123EE`) |
| 503 | `"Source Unavailable"` (test PAN `XXXPX1234Z`) |

Related: `POST /kyc/pan-aadhaar/status` checks PAN–Aadhaar linking (individuals only, not needed for KYB).

---

## 3. GSTIN

The GST endpoints don't take a consent or reason field. Auth uses the same `authorization` and `x-api-key` headers. Their `x-api-version` defaults to `1.0.0`.

### 3a. Search GSTIN (full record): `POST /gst/compliance/public/gstin/search`

Source: https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/public/search_gstin

Request:

```json
{ "gstin": "29AFSPB9500E1ZY" }
```

Response 200 (note the double `data.data` nesting):

```json
{
  "code": 200,
  "data": {
    "data": {
      "adadr": [],
      "ctb": "Proprietorship",
      "ctj": "RANGE-DED8",
      "ctjCd": "YT0804",
      "cxdt": "",
      "dty": "Regular",
      "einvoiceStatus": "No",
      "gstin": "29AFSPB9500E1ZY",
      "lgnm": "Vicky Pvt Ltd",
      "lstupdt": "18/10/2019",
      "nba": ["Supplier of Services"],
      "pradr": {
        "addr": {
          "bnm": "Wellington New Place, Prestige Shantiniketan",
          "bno": "26666, Block 77",
          "dst": "Bengaluru Urban",
          "flno": "Level 05",
          "geocodelvl": "NA",
          "landMark": "",
          "lg": "",
          "loc": "Bangalore",
          "locality": "",
          "lt": "",
          "pncd": "560048",
          "st": "Whitefield Main Road, Near ITPL",
          "stcd": "Karnataka"
        },
        "ntr": "Supplier of Services"
      },
      "rgdt": "18/10/2019",
      "stj": "LGSTO 036 - Bengaluru",
      "stjCd": "KA119",
      "sts": "Active",
      "tradeNam": "Vicky Pvt Ltd"
    },
    "status_cd": "1"
  },
  "timestamp": 1763446641000,
  "transaction_id": "5248feb5-dd09-4f0d-9a42-14b34b849087"
}
```

Key fields:

- `lgnm`: legal name. `tradeNam`: trade name.
- `sts`: status. Examples show `Active` and `Cancelled`.
- `ctb`: constitution, e.g. `Proprietorship`, `Partnership`, `Private Limited Company`, `Public Limited Company`.
- `dty`: taxpayer type (`Regular` and others).
- `rgdt`: registration date. `cxdt`: cancellation date, `""` when active. `lstupdt`: last updated.
- `pradr.addr.*`: principal address. `adadr[]`: additional places of business, with the same `addr` shape plus `ntr`.
- `nba[]`: nature of business. `einvoiceStatus`.
- Also returned: `stj`/`stjCd`/`ctj`/`ctjCd` (jurisdictions) and optional `canclDt`, `rsnCd` and `typeOfSup`.
- **There's no separate PAN field.** Take the PAN from the GSTIN: `gstin.slice(2, 12)`. Chars 1–2 are the state code.

"Not found" comes back as **HTTP 200** with `status_cd: "0"`. Always check `data.status_cd`:

```json
{ "code": 200, "data": { "error": { "error_cd": "FO8000", "message": "No records found" }, "status_cd": "0" },
  "timestamp": 1763446641000, "transaction_id": "4ebb94a3-b0c2-4253-b688-4e9842e37b75" }
```

An invalid GSTIN returns **422** `{ "code": 422, "message": "Invalid GSTIN pattern", ... }`.

### 3b. Verify GSTIN (basic, already parsed): `POST /gst/compliance/public/gstin/verify`

Source: https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/public/verify_gstin

Request `{ "gstin": "24ABKCS2033B1ZV" }`. Response 200:

```json
{
  "code": 200,
  "timestamp": 1775824753133,
  "data": {
    "data": {
      "legalName": "SANDBOX FINANCIAL TECHNOLOGIES PRIVATE LIMITED",
      "bussNature": "Service Provider and Others",
      "stateName": "Gujarat",
      "validGstin": true,
      "stateCode": "24",
      "pan": "ABKCS2033B",
      "gstin": "24ABKCS2033B1ZV",
      "regStartDate": "06/02/2023",
      "status": "Active"
    },
    "status_cd": "1"
  },
  "transaction_id": "31ac0ccf-39b6-42e0-9646-aebf47d8d980"
}
```

- `status` is free text, e.g. `"Cancelled on application of Taxpayer"`.
- This endpoint **does** return `pan` and `legalName`. It doesn't return the trade name or address.
- An invalid GSTIN returns 422 `"Invalid GSTIN pattern"`.

### 3c. Search GSTINs by PAN: `POST /gst/compliance/public/pan/search?state_code=XX`

Source: https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/public/search_pan_state_code

- Body `{ "pan": "AAACJ2440E" }`. The query param `state_code` is **required**.
- The response `data` is an **array** of `{ "gstin": "...", "data": { ...same fields as 3a... } }`.
- No records: `{ "code": 200, "data": { "error_code": "NOGSTIN", "message": "No records found" } }`.
- This one has a **per-call wallet charge** (section 6).

---

## 4. Company / LLP master data (MCA)

Source: https://developer.sandbox.co.in/api-reference/kyc/mca/overview. The Director Master Data API (`POST /mca/director/master-data/search`, by DIN) is **discontinued** per the overview.

### 4a. `POST /kyc/mca/company/master-data`

Source: https://developer.sandbox.co.in/api-reference/kyc/mca/company_master_data

- Optional header `x-source: primary | secondary` sets the data source. The docs don't say what each means (**UNCONFIRMED**).
- There's no `@entity`, consent or reason in the body. `additionalProperties: false`.

Request:

```json
{ "cin": "U72900GJ2015PTC082637" }
```

- The request schema pattern is `^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$`, which only allows a 21-char CIN.
- The overview and summary say "CIN or LLPIN", and the response `cin` pattern also accepts the LLPIN forms `AAA-1234` and `A12345`. **UNCONFIRMED:** whether an LLPIN is sent in the `cin` field. The request schema would reject it. Use `/search?cin=` (4b) for LLPINs, or test it.

Response 200, as shown in the doc example:

```json
{
  "code": 200,
  "timestamp": 1782021074236,
  "data": [{
    "updated_at": 1783351002317,
    "@entity": "in.co.sandbox.kyc.mca.company_master_data",
    "cin": "U72900GJ2015PTC082637",
    "company_name": "QUICKO INFOSOFT PRIVATE LIMITED",
    "company_roc_code": "ROC Ahmedabad",
    "company_category": "Company limited by shares",
    "company_sub_category": "Non-government company",
    "company_class": "Private",
    "authorized_capital": 15200000,
    "paidup_capital": 14566670,
    "company_registration_date": "2015-03-19",
    "registered_office_address": "B/701 ,Amrapali Lakeview Tower   Opp.Vastrapur Lake, Vastrapur,Ahmedabad,Ahmedabad,Gujarat,380015-India",
    "listing_status": "Unlisted",
    "company_status": "Active",
    "company_state_code": "gujarat",
    "company_origin": "India",
    "nic_code": "72900",
    "company_industrial_classification": "Business Services"
  }],
  "transaction_id": "321e98ad-b002-4c4e-ad6b-34121e06c127"
}
```

**Doc inconsistency:** the schema says `data` is an **object**, but the example shows an **array**. Parse both shapes: `Array.isArray(d) ? d[0] : d`.

- Required response fields: `@entity`, `cin`, `updated_at`. All the others are optional.
- `authorized_capital` and `paidup_capital` are absent on some LLPIN records.
- The response has no director list.

Errors:

- 400 `"Invalid request body"`.
- **521** `"Company master data not found for CIN: U34300GJ2017PLC097818"`. This is a non-standard HTTP code, so treat it as not found.

### 4b. `GET /kyc/mca/company/master-data/search?cin=...` or `?company_name=...`

Source: https://developer.sandbox.co.in/api-reference/kyc/mca/search_company

Pass exactly one of `cin` or `company_name`. `company_name` needs at least 3 characters and does a prefix match.

Response:

```json
{
  "code": 200,
  "timestamp": 1783319160519,
  "data": {
    "@entity": "in.co.sandbox.kyc.mca.company_master_data_search_response",
    "records": [
      { "@entity": "in.co.sandbox.kyc.mca.company_master_data_search_result",
        "cin": "U72900GJ2015PTC082637", "company_name": "QUICKO INFOSOFT PRIVATE LIMITED" }
    ],
    "limit": 5, "offset": 0, "count": 1, "has_more": false
  },
  "transaction_id": "5979f864-959f-4cf3-9c24-ecc9f2bd6431"
}
```

- Name search also returns LLPs (e.g. `"cin": "AAJ-9269"`, `"MAC ADMARKETING LLP"`).
- `limit` defaults to 5 and `offset` to 0, and both are echoed back. The spec doesn't list them as query params, so whether you can send `limit`/`offset` is **UNCONFIRMED**.
- 400 messages: `"pass only one of cin or company_name"`, `"company_name must be at least 3 characters long"`, `"cin must be a valid MCA CIN"`.
- 521 `"Company master data not found: <query>"`.
- Use this to power a company-name typeahead, then call 4a with the chosen CIN.

---

## 5. Bank account verification

Source: https://developer.sandbox.co.in/api-reference/kyc/bank/endpoints/penny_drop · https://developer.sandbox.co.in/api-reference/kyc/bank/endpoints/penny_less

These endpoints have no body. The account number goes **in the URL path**, so keep it out of your own logs.

- **Penny drop:** `GET /bank/{ifsc}/accounts/{account_number}/verify?name=<optional>&mobile=<optional>`. `ifsc` must match `^[A-Za-z]{4}[a-zA-Z0-9]{7}$`. `mobile` must match `^[6-9]\d{9}$`.

```json
{ "code": 200, "timestamp": 1000000000000, "transaction_id": "46e33c70-e192-49cb-8d0f-e0c4489d0958",
  "data": { "@entity": "@in.co.sandbox.bank.account.penny_drop_verification_response",
            "message": "Bank Account details verified successfully.",
            "account_exists": true, "name_at_bank": "John Doe",
            "utr": "329613870973", "amount_deposited": "1" } }
```

- Failures still return **HTTP 200**, with only `message` and sometimes `account_exists`. Messages include: `Invalid account number or ifsc provided`, `Given account is an NRE account`, `Account is blocked`, `IFSC is invalid`, `Source bank declined`, `Beneficiary bank offline`, `NPCI Unavailable`, `IMPS Mode fail`.
- Other error codes:
  - 422: `Invalid IFSC pattern`, `Please provide a valid bank account`, `Invalid IFSC provided`.
  - 500: `Failed at bank`, `Transaction failed`, `IMPS not supported on Beneficiary account`.
  - 503: `Source Unavailable`.
- **Penny-less:** `GET /bank/{ifsc}/accounts/{account_number}/penniless-verify`. It returns `{ "@entity": "@in.co.sandbox.bank.account.penny_less_verification_response", "account_exists": true, "name_at_bank": "JOHN DOE" }`.
- `GET /bank/{ifsc}` returns IFSC details.
- Charging (2022 changelog in `llms-full.txt`): a code-200 response where the penny drop didn't happen is charged **₹0.75 + GST**. Already-verified accounts are cached for 12 hours, with no wallet charge.

---

## 6. Pricing and plans

Sources: https://sandbox.co.in/pricing (schema.org JSON-LD in the page HTML) · https://developer.sandbox.co.in/guides/billing-and-invoicing/subscription · https://developer.sandbox.co.in/guides/billing-and-invoicing/wallet

| Plan | Price (INR) | Notes |
|---|---|---|
| Startup | 899 | All APIs, usage reports and analytics |
| Growth | 8399 | Adds overdraft and roadmap access |
| Unicorn | 16699 | Adds a dedicated account manager and private Slack channel |

- **UNCONFIRMED:**
  - Whether these prices are per month and whether they exclude GST. The pricing table loads dynamically, and the JSON-LD has no billing period.
  - The "9.99 to 99 per month" figure. I didn't find it in any doc. It doesn't match the INR prices above.
  - The monthly quota per plan.
- Every plan includes all APIs. Quota is a fixed number of calls per month. It resets each billing cycle and doesn't carry forward.
- **Only 2xx responses use quota.** 4xx and 5xx responses don't.
- Overdraft (Growth and above) bills calls past quota at the plan's per-call rate.
- The subscription guide mentions a 14-day free trial.
- **Wallet charges** apply on top of the plan, per successful call. They cover **PAN Verification**, **Bank Verification**, **Search GSTIN with PAN and State Code**, Aadhaar OKYC, DigiLocker and others.
  - GSTIN search/verify and MCA master data are **not** on the wallet-charge list. They only use quota.
  - The per-call ₹ amounts for PAN, GSTIN-by-PAN and penny drop are **UNCONFIRMED**. They aren't in the docs. Check the Console or the cost calculator at https://sandbox.co.in/tools/cost-calculator.
- The test environment is free.

---

## 7. Rate limits, caching, consent

Rate limits (source: https://developer.sandbox.co.in/guides/developer-resources/rate_limits):

- **Test: 25 req/min. Production: 500 req/min.** Going over returns **429**. Use exponential backoff.
- You can ask support for a custom limit increase.
- The docs don't say whether limits apply per key or per account. Some older pages say "100 requests per minute per API key", which conflicts with the dedicated page. Treat the dedicated page as current.

Caching (source: https://developer.sandbox.co.in/guides/developer-resources/response_caching):

- `x-accept-cache: true` returns a cached response if one exists. Cached responses are kept for 24h and incur **no wallet charge**, but they still count as usage.
- Without the header, you get fresh data.
- The response header `X-Cache` shows the cache status.

Consent:

- `POST /kyc/pan/verify` **requires** `consent: "Y"` and a `reason` of at least 20 characters in the body.
- The GST public endpoints, MCA company endpoints and bank endpoints have no consent field.
- Under DPDP, collect and log a consent checkbox from the onboarding user before calling PAN verify. Store the timestamp, user id and the `reason` string you sent. This is our own policy and not something Sandbox requires beyond the body field.
- The docs say never to put PAN, Aadhaar or GSTIN in query params or URL paths (https://developer.sandbox.co.in/guides/developer-resources/post_for_get). But MCA search (`?cin=`) and the bank endpoints do put identifiers in the URL, so redact URLs in logs.

Generic errors (source: https://developer.sandbox.co.in/guides/developer-resources/errors):

- 400 missing or invalid fields.
- 401 invalid key or secret.
- 403 access denied: token, permissions, credits or quota.
- 404 bad endpoint (in test, also an unmatched mock).
- 422 invalid format.
- 429 rate limit.
- 500 server.
- 503 source unavailable.
- 504 timeout.
- Also **521** (MCA not found) and in-body `status_cd: "0"` (GST not found).

---

## 8. Server route sketch (Next.js 16, Node runtime)

```ts
// web/src/lib/sandbox.ts  (server-only)
import "server-only";
const BASE = process.env.SANDBOX_BASE_URL!; // https://test-api.sandbox.co.in | https://api.sandbox.co.in
let tok: { v: string; exp: number } | null = null;

async function token() {
  if (tok && tok.exp > Date.now()) return tok.v;
  const r = await fetch(`${BASE}/authenticate`, {
    method: "POST",
    headers: { "x-api-key": process.env.SANDBOX_API_KEY!, "x-api-secret": process.env.SANDBOX_API_SECRET!, "x-api-version": "1.0.0" },
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`sandbox auth ${r.status}`);
  tok = { v: j.data.access_token, exp: Date.now() + 23 * 3600_000 };
  return tok.v;
}

export async function sbx(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: init.method ?? "POST",
    headers: { authorization: await token(), "x-api-key": process.env.SANDBOX_API_KEY!, "x-api-version": "1.0.0", "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  return { http: r.status, json: await r.json() }; // caller checks http, data.status_cd, 521 etc.
}
```

Env vars to add in Vercel (server only, no `NEXT_PUBLIC_`): `SANDBOX_BASE_URL`, `SANDBOX_API_KEY`, `SANDBOX_API_SECRET`.

## Open items to confirm once there's a test key

1. Whether an LLPIN is accepted in `POST /kyc/mca/company/master-data`.
2. Whether `data` is an object or an array there.
3. Per-call wallet ₹ for PAN verify and penny drop, and the quota for each plan.
4. The full `category` enum for PAN.
5. What the `x-source` primary/secondary values mean.
