# MaisonVerre — White Strawberry E-commerce Landing Page

An Arabic, RTL-first e-commerce experience for a white-strawberry seed product. This repository brings together a conversion-focused product landing page, order capture, and an administration workflow.

> Built as a practical e-commerce project; business performance figures are intentionally not included unless they can be verified and shared.

## What’s inside

- Arabic RTL product landing page with product details, images, bundle options, and a mobile-first order flow.
- Alternate `/ecom12` landing-page experience that reuses the product and order logic.
- Customer order and lead capture, including location/delivery-fee handling.
- Admin dashboard and settings, including a configurable Meta Pixel ID.
- Facebook Pixel event tracking and Telegram order notifications.
- Product and campaign configuration organized in the React app.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **UI:** Radix UI, Lucide, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Data:** PostgreSQL-compatible Neon serverless driver
- **Testing & quality:** Vitest, TypeScript, Prettier

## Run locally

Requirements: Node.js and pnpm.

```bash
pnpm install
cp .env.example .env
# Fill in the required values in .env
pnpm dev
```

Use the scripts below to validate or build the project:

```bash
pnpm check
pnpm test
pnpm build
```

## Project notes

- The default route (`/`) is the primary MaisonVerre experience; `/ecom12` is an alternate presentation.
- Product, bundle, campaign, and tracking configuration lives in `client/src/react-app/product-config.ts`.
- See `docs/order-workflow.md` for the order flow and `docs/product-landing-pages.md` for landing-page guidance.
- Environment variable names and setup notes are provided in `.env.example`.

## Portfolio context

This project demonstrates hands-on work at the intersection of e-commerce, landing-page implementation, order workflows, and analytics instrumentation. It is one of the e-commerce projects in my portfolio; performance metrics can be added when I have figures I can publish responsibly.
