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

The root `.gitignore` ignores `dist`, so a NEW file under `dist/` is skipped by `git add -A`. Add new published files with `git add -f`, and check `git status --ignored` before every commit. A page or script missing from `dist/` is a 404 on the live site.

It is plain HTML, CSS and JavaScript. No framework, no bundler, no npm. Keep it that way unless Marx decides otherwise.

## Design rules ("Savanna Dusk")
Colours are tokens at the top of `static/css/site.css`. Use the tokens; never write a new hex value in a component rule. Illustration fills inside the SVGs in `templates/partials/art.html` and `area_art.html` are the one exception.

- 60% canvas: ivory `#FBF6EE`, white cards, sand `#F3E9DA` for alternate bands
- 30% structure: kahawa (espresso) `#2A1A12` for header, sticky bars, hero, footer, headings; raised kahawa `#3A271C` for cards on dark
- 10% action: sunset `#E2672A` with kahawa text for the main button, current step and selected state (hover goes lighter, `#EC7A40`, never darker); gold `#EDB750` as the highlight on dark only
- Acacia `#2F6B4F` only for "Verified by the business" and "Open now"
- Dark and light bands meet in a soft arc or wash, never a hard edge
- Three buttons only: `btn-primary`, `btn-ghost`, `btn-dark` (`btn-navy` is its old name, kept as an alias)
- Type: Bricolage Grotesque for headings, DM Sans for body, Caveat for the script line in heroes
- The sunset light trail along the route is the signature element. The Maasai bead strip is a small accent only.
- Illustrations are original inline SVGs (`templates/partials/art.html`, styled by `static/css/art.css`): generic and unbranded, never a real business, no prices or dates. They fill the heroes of stops without a photograph.
- Text over a photo must keep its contrast against the brightest part of the image; the hero shade and the backing on breadcrumbs and eyebrows exist for this.

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
- Nothing loops forever: illustration movements play a few times and rest; the hero photo drift stops after about a minute.
- 3D is CSS only (pointer tilt on cards, mouse or trackpad only). No 3D library and no video files.
- New browser features are progressive enhancement: the site must work unchanged where they are missing.

## Accounts
Visitors can save places (kept in the browser) and, when accounts are on, sign in to keep them across devices. Sign-in and storage are a Supabase project; its address and publishable key are in `data/site.json` under `accounts` and are public by design. Never commit a secret or service-role key.

- `accounts.live` is the public switch. While it is `false`, no account feature is visible and no outside service is contacted; `?preview=accounts` on any page turns them on for that browser only, `?preview=off` turns them off.
- All account code is in `static/js/account.js`. The Supabase library is loaded from jsDelivr only on the account page or when a sign-in is already held. It is the one outside script on the site.
- The public privacy notice is `templates/privacy.html` while accounts are off and `templates/privacy_accounts.html` once `live` is true. Keep the second one true to what the code actually does.
- This workspace cannot reach Supabase or jsDelivr, so account changes are tested against a stand-in and must be confirmed by Marx on the live site before `live` is switched on.

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
- Visitor accounts: built, hidden behind `accounts.live`. Before switching on: Supabase table and address settings, Google sign-in credential, an email sending service for sign-in links, and a live test by Marx
