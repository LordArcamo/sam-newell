# Sam Newell — Real Estate & Growth

Rebuild of [samnewellrealestate.com](https://samnewellrealestate.com/) (formerly WordPress/Elementor) as a static **Astro + React + GSAP** site.

## Stack

- **Astro 7** — static site, one HTML file per page
- **React 19** — interactive islands (header, stat counters, testimonial carousel, forms)
- **GSAP 3 + ScrollTrigger** — hero timeline, scroll reveals, parallax, count-up stats
- **Fraunces + Archivo** (variable fonts, self-hosted via Fontsource)

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the production build |

## Structure

- `src/data/site.ts` — **all site content in one place** (contact info, stats, services, listings, testimonials, socials). Edit copy here first.
- `src/layouts/Base.astro` — head/SEO, header/footer, global GSAP scroll-reveal engine (`data-reveal`, `data-reveal-group`, `data-parallax` attributes).
- `src/pages/` — home, about, services, real-estate, framing, multi-investments, parenting, contact, 404.
- `src/components/` — Astro sections + React islands.
- `public/images/` — assets pulled from the original site.

## Content notes

- Listing cards (`src/data/site.ts` → `LISTINGS`) use the property photos and Zillow deep links from the original site (photos in `public/images/listings/`). Zillow blocks automated price scraping, so prices/status intentionally live on Zillow via the card links — they never go stale. Swap this array as Sam's inventory changes.
- `wasatch.jpg` and `utah-road.jpg` are Unsplash photos (free license, no attribution required) used as darkened section backgrounds.

- Stats ($450M+ volume, 2,000+ doors, CCIM, 4.8★ podcast) sourced from Sam's public profiles (LinkedIn, LoopNet, mficlub.com, Apple Podcasts) — **verify with Sam before launch**.
- Zillow review quotes are paraphrased from public snippets (marked "paraphrased" in the UI); replace with verbatim reviews pulled from Zillow when available.
- `/terms/` and `/privacy/` are plain-English templates — have an attorney review before launch.

## Forms (Resend)

Contact + newsletter submit to serverless API routes (`src/pages/api/`) that send via [Resend](https://resend.com). Deployed on Vercel via `@astrojs/vercel`.

1. Create a Resend API key and copy `.env.example` → `.env` (locally) or set the same vars in Vercel project settings.
2. `RESEND_TO` = where messages land. Optional: `RESEND_AUDIENCE_ID` to collect newsletter contacts in a Resend Audience.
3. To send from `@samnewellrealestate.com`, verify the domain in Resend and set `RESEND_FROM`; until then the sandbox sender is used.

Without the env vars the API returns 503 and the forms show a graceful "call instead" message.
