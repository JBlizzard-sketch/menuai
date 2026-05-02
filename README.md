# MenuAI

> AI-powered menu management, translation, and allergen compliance platform for Nairobi's upscale restaurant scene.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-green)](https://platform.openai.com/)

---

## Overview

MenuAI is a full-stack SaaS platform that helps Nairobi restaurants manage multilingual menus, automate allergen detection, and serve beautiful QR-accessible digital menus to guests. Built for properties like The Talisman (Karen), Sankara Nairobi (Westlands), and Haandi (Gigiri).

### Key Features

| Feature | Description |
|---|---|
| **AI Translation** | Translate entire menus into 8 languages (French, Spanish, Arabic, Chinese, German, Japanese, Italian, Swahili) via GPT |
| **Allergen Detection** | AI scans dish names and descriptions to suggest allergens; staff confirm or reject via a review queue |
| **Digital Menu (QR)** | Guest-facing public menu served at `/public/:slug` — no login needed, supports language switching |
| **Tonight's Specials** | Toggle any dish as a special; dashboard surfaces the list in real-time |
| **Availability Toggles** | Mark dishes on/off in real-time; unavailable dishes are hidden from the public menu |
| **Analytics Dashboard** | Per-restaurant stats: total dishes, menu views, translation coverage, pending allergen reviews |
| **Multi-restaurant** | Supports multiple restaurant profiles under one platform instance |

---

## Tech Stack

### Monorepo Structure (pnpm workspaces)

```
/
├── artifacts/
│   ├── api-server/          # Express 5 REST API + OpenAI integration
│   └── menuai/              # React + Vite frontend (SPA)
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 contract (source of truth)
│   ├── api-client-react/    # Auto-generated React Query hooks + Zod schemas
│   ├── api-zod/             # Auto-generated Zod validators for server use
│   ├── db/                  # Drizzle ORM schema + migrations + seed
│   └── integrations-openai-ai-server/  # OpenAI client (Replit-proxied)
└── scripts/                 # Utility scripts (GitHub push, etc.)
```

### Frontend (`artifacts/menuai`)

- **React 19** + **Vite 6**
- **wouter** — lightweight client-side routing
- **shadcn/ui** + **Tailwind CSS** — component library and styling
- **@tanstack/react-query v5** — server state management
- **Auto-generated hooks** from OpenAPI spec via Orval

### Backend (`artifacts/api-server`)

- **Express 5** with async error handling
- **Drizzle ORM** + **PostgreSQL** (Replit managed DB)
- **Zod** — runtime request/response validation
- **OpenAI GPT-4o-mini** — translation and allergen detection
- **nanoid** — QR slug generation
- **pino** — structured logging

### Code Generation

The API contract lives in `lib/api-spec/src/openapi.yaml`. Running:

```bash
pnpm --filter @workspace/api-spec run codegen
```

regenerates React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`) automatically.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or use Replit's managed DB)

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Express session secret (min 32 chars) | Yes |
| `OPENAI_API_KEY` | OpenAI API key (or use Replit AI proxy) | Yes |
| `PORT` | Port for each service (injected by Replit workflows) | Auto |

### Install & Run

```bash
# Install all workspace dependencies
pnpm install

# Run database migrations
pnpm --filter @workspace/db run migrate

# Seed with sample Nairobi restaurant data
pnpm --filter @workspace/db run seed

# Start the API server (default: PORT=3001)
pnpm --filter @workspace/api-server run dev

# Start the frontend (default: PORT=5173)
pnpm --filter @workspace/menuai run dev
```

On Replit, both services are managed as workflows and start automatically.

---

## API Reference

All endpoints are prefixed with `/api`.

### Restaurants

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/restaurants` | List all restaurants |
| `POST` | `/api/restaurants` | Create a restaurant |
| `GET` | `/api/restaurants/:id` | Get restaurant detail |
| `GET` | `/api/restaurants/:id/analytics/summary` | Analytics summary |
| `GET` | `/api/restaurants/:id/tonights-specials` | Tonight's specials |
| `GET` | `/api/restaurants/:id/popular-dishes` | Most-viewed dishes |

### Menus

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/menus?restaurantId=` | List menus for a restaurant |
| `POST` | `/api/menus` | Create a menu |
| `GET` | `/api/menus/:id` | Menu with sections and dishes |
| `POST` | `/api/menus/:id/translate` | AI-translate all dishes |
| `POST` | `/api/menus/:id/detect-allergens` | AI allergen scan |
| `GET` | `/api/menus/:id/allergen-queue` | Pending allergen reviews |

### Dishes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dishes/:id` | Dish detail with allergens + translations |
| `PATCH` | `/api/dishes/:id` | Update dish (availability, specials, etc.) |
| `GET` | `/api/dishes/:id/allergens` | List allergens for a dish |
| `POST` | `/api/dishes/:dishId/allergens` | Add allergen |
| `PATCH` | `/api/allergens/:id` | Update allergen (confirm/reject) |
| `DELETE` | `/api/allergens/:id` | Remove allergen |

### Public (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/public/menu/:slug` | Guest-facing digital menu |
| `POST` | `/api/public/menu/:slug/view` | Record a dish view event |

---

## Database Schema

```
restaurants        — name, address, city, logoUrl, timezone
menus              — restaurantId, name, qrSlug, isPublished
sections           — menuId, name, sortOrder
dishes             — sectionId, name, description, price, currency, isAvailable, isSpecial, dietaryLabels, sortOrder
allergens          — dishId, allergenType (enum), isAiSuggested, isConfirmed
dish_translations  — dishId, languageCode, name, description, culinaryExplanation
dish_views         — dishId, timestamp
```

### Allergen Types (18 supported)

`gluten` · `dairy` · `eggs` · `fish` · `shellfish` · `tree_nuts` · `peanuts` · `soy` · `sesame` · `mustard` · `celery` · `lupin` · `molluscs` · `sulphites` · `wheat` · `crustaceans` · `latex` · `corn`

---

## Seeded Demo Data

Three Nairobi restaurants are seeded out of the box:

| Restaurant | Neighbourhood | QR Slug |
|---|---|---|
| The Talisman | Karen | `talisman-dinner-2025` |
| Sankara Nairobi | Westlands | `sankara-alacarte-2025` |
| Haandi | Gigiri | `haandi-main-2025` |

Public menus are accessible at:
- `/public/talisman-dinner-2025`
- `/public/sankara-alacarte-2025`
- `/public/haandi-main-2025`

---

## Workflows (Replit)

| Workflow | Command | Port |
|---|---|---|
| API Server | `pnpm --filter @workspace/api-server run dev` | `$PORT` |
| Web Frontend | `pnpm --filter @workspace/menuai run dev` | `$PORT` |

Both workflows run concurrently and are reverse-proxied:
- `/api/*` → API Server
- `/*` → Frontend SPA

---

## Scripts

```bash
# Push latest commits to GitHub
pnpm --filter @workspace/scripts run push-github

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Run TypeScript checks across all packages
pnpm run typecheck

# Run database migrations
pnpm --filter @workspace/db run migrate
```

---

## Roadmap

- [ ] Image uploads for dishes (via Replit Object Storage)
- [ ] Per-table QR codes with table number context
- [ ] Dietary label filters on public menu (vegan, halal, kosher)
- [ ] Customer feedback / dish rating on public menu
- [ ] WhatsApp menu sharing integration
- [ ] Stripe payments for subscription billing
- [ ] Staff mobile app (Expo React Native)

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Contributing

PRs are welcome. Please open an issue first to discuss major changes.

1. Fork the repo
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

---

*Built for Nairobi's upscale hospitality sector. Powered by OpenAI, Drizzle ORM, and the pnpm monorepo toolchain.*
