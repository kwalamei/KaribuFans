# KaribuFans team brief

Read this first. It applies to every agent and every session that works on this repository.

## What this is
KaribuFans is a Nairobi city guide: stays, food, rides, matchday, nightlife, movies and games, and tickets, presented as one route of seven stops. Visitors book directly with the business. The owner is Marx. Launch date: 15 October 2026. "KaribuFans" is a working name; it is set once in `data/site.json`.

## Where the code is
The live site is `KaribuFans/03_Website/Source_Code/karibufans-site/`. Everything else in the repository is planning material.

- `data/` content (site settings, the seven modules, listings)
- `templates/` Jinja2 page layouts
- `static/` CSS, JavaScript, images
- `dist/` the published site that Vercel serves. Generated. Never edit it by hand.
- `karibufans-site/karibufans-site/` is an old copy from before the current theme. Do not edit it and do not copy from it.

Build: `python3 build.py` (needs `pip install jinja2`). Always rebuild and commit `dist/` together with the source change, because Vercel serves `dist/` as committed and runs no build step.

It is plain HTML, CSS and JavaScript. No framework, no bundler, no npm. Keep it that way unless Marx decides otherwise.

## Design rules ("Sunset on Ngong Road")
Colours are tokens at the top of `static/css/site.css`. Use the tokens; never write a new hex value in a component rule.

- 60% canvas: sand `#F7F4EF`, white cards
- 30% structure: twilight navy `#0A1128` for header, sticky bars, hero, footer, headings
- 10% action: amber `#E67E22` for the main button, current step and selected state; gold `#D4AF37` as the highlight on navy only
- Emerald `#1B4D3E` only for "Verified by the business" and "Open now"
- Three buttons only: `btn-primary`, `btn-ghost`, `btn-navy`
- Type: Bricolage Grotesque for headings, DM Sans for body, Caveat for the script line in heroes
- The amber light trail along the route is the signature element. The Maasai bead strip is a small accent only.

## Content rules
- A listing with `"status": "unclaimed"` is a real business that has not joined. Show only what its own website publishes: name, type, area, street, website link, directions. No photos, prices, phone or WhatsApp. Keep `source_url` and `checked` on every entry.
- Never invent a fact about a business, a fixture, a price or a date. If it is not confirmed, leave it out.
- KaribuFans is independent. Do not use CAF, tournament, Uber or Bolt logos or imply affiliation. Tournament dates are not shown until confirmed.
- KaribuFans does not sell tickets and never handles payment.
- The language switcher stays visible even before translations exist.

## Motion rules
- Motion explains where you are on the route; it is not decoration.
- Animate `transform` and `opacity` only. Nothing that is meant to be read may depend on JavaScript to become visible.
- Everything is switched off under `prefers-reduced-motion: reduce`.
- New browser features are progressive enhancement: the site must work unchanged where they are missing.

## How the team works
- Lead: holds this brief, splits the work, checks results, and is the only one who commits and pushes.
- Builder: changes `templates/`, `static/` and `data/`. One builder at a time per file.
- Listings researcher: adds venues under the content rules above.
- Reviewer: did not write the change. Rebuilds, loads every page at desktop and phone width, checks links, keyboard use and reduced motion, and checks the change against this brief.

Nothing is pushed until the reviewer has passed it. Marx chose commits straight to `main`, which is the live site, so a push is a release.

## Open items (Marx to supply)
- `contact_whatsapp` in `data/site.json`: empty, so the vendor sign-up and ticket alert forms cannot send yet
- `uber_client_id` in `data/site.json`
- Registered business name for the footer
- Real photographs; hero images are currently labelled as artist's impressions
- Visitor accounts with sign-in: wanted, needs a sign-in service to be chosen and set up
