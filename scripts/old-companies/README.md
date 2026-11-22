# Old Qualty companies: export and re-registration email

One-off tooling to invite companies and inspectors from the old Qualty backend
(`QualtyAI/server`, Express + Sequelize + Postgres) to register again on https://qualty.ai/companies.

| File | What it does |
|---|---|
| `export.mjs` | Reads the old Postgres database (read-only) and writes `companies.csv` |
| `email.md` | The email: 2 subject options, plain text, HTML |
| `send.mjs` | Sends `email.md` to `companies.csv` through Resend. Dry run unless `--send` |
| `.gitignore` | Keeps `companies.csv`, `sent.csv`, `unsubscribed.txt` and `node_modules/` out of git |

`companies.csv`, `sent.csv` and `unsubscribed.txt` hold customer data. Do not commit them,
paste them into chats or tickets, or put them in the Obsidian vault. Delete them when the campaign is done.

## 1. Export

```bash
cd QualtyAI/scripts/old-companies
npm install                      # installs pg (only dependency)
DATABASE_URL='postgres://USER:PASS@HOST:5432/DBNAME' node export.mjs
# hosted Postgres that needs SSL without a CA bundle:
DATABASE_SSL=1 DATABASE_URL='...' node export.mjs
```

Pass the URL on the command line or from a password manager. Don't save it in a file in this repo.
The script runs inside a `READ ONLY` transaction, only selects contact columns (no passwords,
bank or ID fields), and prints counts per source, never rows.

### Where the data comes from

Every model sets `tableName`, so Sequelize does not pluralise any table name.

| `source` | Table (model file) | company_name | contact_name | email | phone | country |
|---|---|---|---|---|---|---|
| `indian_company` | `indian_companies` (`indiancompany.js`) | `company_name` | `representative_name` | `email_address` | `contact_number`, else `office_number` | `India` (fixed) |
| `international_company` | `international_company` (`internationalcompany.js`) | `company_name` | none | **none in the model** | `office_number` | none |
| `indian_inspector` | `indian_inspectors` (`Indianinspector.js`) | none | `name` | `email_id` | `mobile_number` | `India` (fixed) |
| `international_inspector` | `international_inspectors` (`Internationalinspector.js`) | none | `full_name` | `email_address` | `mobile_number` | `country_code` (a dialling code like `+44`) |

- `city` is always blank. No model has a city column, only free-text addresses
  (`registered_address` and `address`), which are left out.
- `created_at` is read from `createdAt`, or from `created_at` if the global Sequelize
  `define.underscored` option was on. The script checks which one exists at run time.
- **International companies have no email column**, so with the schema as modelled they all
  count as `no_valid_email`. If the live table does have an `email_address`, `email` or
  `email_id` column, the script uses it.
- `customers` (`customer.js`) is left out on purpose because it holds buyers, not inspection companies.
- Deduplication: emails are lowercased and trimmed, and only the first row per email is kept.
  Sources are read in the table order above, oldest first, so a company row beats an inspector
  row with the same email. Rows without a valid-looking email are skipped.

## 2. Review the CSV

Open `companies.csv` in Google Sheets (File → Import → Upload, "Replace spreadsheet") or Numbers,
in a private sheet. Check:

1. Counts match what the script printed.
2. Remove test accounts, staff addresses, competitors and anyone who has already registered on
   qualty.ai. To check the last group, compare against the company emails in Supabase.
3. Decide on international rows. The email asks for PAN and GSTIN, which only Indian
   companies have (see "Notes for review" in `email.md`). Use `--only=indian_company,indian_inspector`
   to mail Indian rows first.
4. Pick a subject from `email.md` and read both bodies once more.

Export the cleaned sheet back to `companies.csv` (File → Download → CSV), keeping the same headers.
Cells that look like formulas were prefixed with `'` by the export; `send.mjs` strips it again.

## 3. Send

Before the first send:

- Verify `qualty.ai` as a sending domain in Resend (SPF, DKIM, and a DMARC record), or mail
  from `team@qualty.ai` will be rejected or land in spam.
- Send one test to yourself: make a one-row CSV with your own email and run
  `node send.mjs --csv=test.csv --send`.

### Option A: Resend batch API (`send.mjs`)

```bash
node send.mjs                                    # dry run: count + first subject, sends nothing
node send.mjs --only=indian_company --limit=50   # dry run on a slice
RESEND_API_KEY=re_xxx node send.mjs --send --limit=50 --subject=1
```

- Uses `POST https://api.resend.com/emails/batch`, up to 100 emails per call, from
  `Qualty <team@qualty.ai>`, reply-to `iq@cargofirst.net`, with a `List-Unsubscribe` header.
- Each call has an `Idempotency-Key`, so a retried call is not sent twice. It retries 429/5xx and
  stops on any other error.
- Every sent address goes into `sent.csv`, and the next run skips them. Run it again with a
  new `--limit` for the next batch.
- Names are filled into the greeting (`contact_name`, else `company_name`, else "Hello,").

### Option B: Google Sheets mail merge

1. Import `companies.csv` into a Google Sheet. Add a `greeting_name` column, for example
   `=IF(C2<>"",C2,B2)`.
2. Use a mail-merge add-on (YAMM, GMass or Mailmeteor) from a Google Workspace account on
   `qualty.ai`. Set Reply-to to `iq@cargofirst.net`.
3. Paste the plain-text body (or the HTML) from `email.md`, and replace `{{greeting_name}}`
   with the add-on's merge tag.
4. Gmail caps daily sending (about 2,000 a day on Workspace, less on new accounts and through add-ons).
   Spread the list over several days.

## Sending in batches

- Start with 20 to 50 addresses. Watch bounces, spam complaints and replies for a day before
  you send more.
- Old lists bounce a lot. If hard bounces go above about 5% in the first batch, stop and clean the
  list before continuing. Resend's dashboard shows bounces per email.
- Keep the `delay-ms` pause (default 1.5s) between batch calls. Resend rate-limits per API key.

## Honour unsubscribes

- Every email ends with an unsubscribe line (reply "unsubscribe"), and `send.mjs` adds a
  `List-Unsubscribe` mailto header that points to `iq@cargofirst.net`.
- Whoever watches `iq@cargofirst.net` adds each unsubscribe address to `unsubscribed.txt`
  (one per line) **before the next batch**. `send.mjs` skips those addresses. For a Sheets merge,
  delete those rows.
- Add hard bounces and spam complaints from the Resend dashboard to `unsubscribed.txt` as well.
- This is a single invitation. Don't send follow-ups to people who did not reply unless they
  re-register or ask.
