# Qualty.AI — Physical Cargo Quality & Verification Platform

> High-precision quality inspection and laboratory validation platform for global commodity trade, freight cargo, and accredited surveyor management.

Built with a reverse-engineered **Provision Labs** design architecture:
- **Canvas**: OLED Pitch Black (`#000000`) with a 120px hairline coordinate grid.
- **Borders**: 1px crisp architectural hairlines (`#222222`), zero rounded radii (`border-radius: 0`), connected table-like cells.
- **Palette**: Monochromatic neutrals with an electric ultramarine accent (`#0E00FF`).
- **Typography**: `Instrument Sans` (balanced grotesque display) & `IBM Plex Mono` (technical uppercase telemetry).

---

## Architecture Overview

```
QualtyAI/
├── web/                           # Next.js 16 + React 19 + TypeScript Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css        # Provision Labs design tokens & grid canvas
│   │   │   ├── layout.tsx         # Instrument Sans & IBM Plex Mono typography
│   │   │   └── page.tsx           # Assembled interactive inspection platform
│   │   └── components/
│   │       ├── Navbar.tsx         # Header strip with live UTC clock & status
│   │       ├── Hero.tsx           # Full-viewport stage & metric cells
│   │       ├── StandardsStrip.tsx # GAFTA, FOSFA, NABL, ISO accreditation strip
│   │       ├── GrainSpecSimulator.tsx # 10-point physical inspection calibrator
│   │       ├── DualPipeline.tsx   # Physical vs Chemical testing breakdown
│   │       ├── SurveyorNetwork.tsx# Domestic Indian ports & International hubs
│   │       ├── ApiExplorer.tsx    # Live REST API interactive terminal
│   │       ├── EnquiryModal.tsx   # Multi-step inspection enquiry workflow
│   │       └── Footer.tsx         # Architectural system metrics footer
├── server/                        # Express 4.x + Sequelize ORM Backend
│   ├── Controllers/               # Raiseenquiry, Phyinspectionparam, Inspectors
│   ├── models/                    # PostgreSQL Sequelize schemas
│   ├── routes/                    # REST API routes (/v1/api/*)
│   └── config/config.json         # Database connection settings
└── package.json                   # Unified root workspace scripts
```

---

## Quickstart

### 1. Run Web Application (Next.js TypeScript)
```bash
# From QualtyAI directory
npm run dev

# Or directly in web:
cd web
npm run dev -p 3005
```
Open [http://localhost:3005](http://localhost:3005) in your browser.

### 2. Run Backend API Server (Express + PostgreSQL)
```bash
npm run server
```
Listens on port `3214`.

---

## Core Product Capabilities

1. **Grain & Physical Parameter Calibrator** (`/v1/api/Phyinspectionparam`):
   - Real-time evaluation of: Broken %, Purity %, Yellow Kernel, Damage Kernel, Red Kernel, Paddy Kernel, Chalky Rice %, Live Insects (zero tolerance), Milling Degree, and Average Grain Length (mm).
   - Presets for **1121 Basmati**, **IR-64 Non-Basmati**, and **Sona Masoori**.
2. **Dual Verification Pipeline**:
   - Physical on-dock inspection (sampling, draft survey, hold cleanliness).
   - Chemical laboratory assay (GC-MS/MS, LC-MS/MS, HPLC Aflatoxins, ICP-MS heavy metals).
3. **Inspector Network Directory**:
   - Covers Indian ports (Mundra, Kakinada, JNPT, Kandla, Vizag) and international hubs (Dubai, Rotterdam, Singapore, Chittagong, Mombasa).
4. **Interactive Enquiry Transaction Modal**:
   - Full 3-step workflow allowing traders to configure cargo specs, select standards, and submit structured enquiry payloads.

---

## Testing and CI/CD

Run from `web/`:

| Command | What it checks |
|---|---|
| `npm run lint` | ESLint, no errors allowed and the warning count may only go down |
| `npm run typecheck` | TypeScript |
| `npm test` / `npm run test:coverage` | Vitest unit tests for `src/lib` (orders, bids, flags, summary, evidence, market fit), coverage gate 80% |
| `npm run test:e2e` | Playwright on a production build: full user flows on desktop and mobile, axe accessibility scans in light and dark theme, smoke checks |
| `BASE_URL=https://qualty.ai npm run test:e2e` | Read-only smoke checks against a deployed site |

Run `npm run build` once before `npm run test:e2e`; the tests start `next start` on port 3100.

**CI** (`.github/workflows/ci.yml`) runs lint, types, unit tests with coverage, a dependency audit, the build, and the Playwright suite on every pull request and on pushes to `master`.

**CD:** Vercel deploys `master` to qualty.ai on every merge. When Vercel reports the production deployment as successful, `.github/workflows/post-deploy-smoke.yml` runs the smoke tests against the live site. It can also be run by hand from the Actions tab. Dependabot opens weekly dependency update PRs.
