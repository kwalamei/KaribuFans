# KaribuFans team brief

Read this first. It applies to every agent and every session that works on this repository.

## What this is
KaribuFans is a Nairobi city guide: stays, food, rides, matchday, nightlife, movies and games, and tickets, presented as one route of seven stops. It serves everyday Nairobi, Kenya Premier League matches and other events, not only AFCON 2027. Visitors book directly with the business. The owner is Marx. Launch date: 15 October 2026. "KaribuFans" is a working name; it is set once in `data/site.json`.

## Where the code is
The live site is `KaribuFans/03_Website/Source_Code/karibufans-site/`. Everything else in the repository is planning material.

- `data/` content (site settings, the seven modules, listings)
- `templates/` Jinja2 page layouts
- `static/` CSS, JavaScript, images
- `dist/` the published site that Vercel serves. Generated. Never edit it by hand.

Build: `python3 build.py` (needs `pip install jinja2`). Always rebuild and commit `dist/` together with the source change, because Vercel serves `dist/` as committed and runs no build step.

The root `.gitignore` ignores `dist`, so a NEW file under `dist/` is skipped by `git add -A`. Add new published files with `git add -f`, and check `git status --ignored` before every commit. A page or script missing from `dist/` is a 404 on the live site.

It is plain HTML, CSS and JavaScript. No framework, no bundler, no npm. Keep it that way unless Marx decides otherwise.

## Design rules (photo-led, "Squarespace" direction)
Colours are tokens at the top of `static/css/site.css`. Use the tokens; never write a new hex value in a component rule. Illustration fills inside the SVGs in `templates/partials/art.html` and `area_art.html` are the one exception.

- The photographs carry the colour. The interface is ink `#0E0E0E`, white and paper `#F4F2EE`, with greys for muted text and lines
- One accent: sunset `#E2672A`, only for the main button, the route trail and current stop, and selected states. Acacia `#2F6B4F` only for "Verified by the business" and "Open now"
- Type: Instrument Serif for display headings (very large on heroes), DM Sans for everything else
- Three buttons only: `btn-primary`, `btn-ghost`, `btn-dark` (`btn-navy` is its old name, kept as an alias)
- Navigation: up to 1600px wide, 18px labels, a glass pill that glides to the hovered or focused link (transform only; plain CSS hover without JS; no glide under reduced motion). Inline from 1200px; below that a full-screen menu that holds keyboard focus
- The sunset light trail along the route is the signature element

## Photographs
- Masters are in `KaribuFans/03_Website/Photos/unsplash/` (Unsplash licence) and, for the listing-card examples, `KaribuFans/03_Website/Photos/examples/` (Pexels or Unsplash licence). `tools/photos.py` (in the site folder) makes every crop and size and writes `data/photos.json`; never hand-edit the outputs in `static/img/photos/`. Run it, then `build.py`, and never run both at once.
- Every photo used is credited on its hero chip or tile and in the Photo credits section of the privacy notices.
- No logos, brand names, readable signs, number plates or personal names: crop them out, or paint them out in `photos.py` when a crop would spoil the photo.
- Alt text describes what is visible and never names a business; only say Nairobi when the photo visibly is (skyline, KICC, Nairobi National Park).
- Stop-page galleries sit in their own band, before the listings, with the caption that the photos are not of the places listed. Unclaimed listing cards for a hotel, apartment, guesthouse or restaurant may carry a stock example photo of that type of place (Marx approved, 9 Oct), always labelled "Example photo, not of this place" and credited; made by the `EXAMPLES` list in `photos.py`. Every other unclaimed card uses the drawn area art. A business's own photos replace the example only once it joins.
- Text over a photo must keep its contrast against the brightest part of the image; the hero shade and the backings on small text exist for this.

## Content rules
- A listing with `"status": "unclaimed"` is a real business that has not joined. Show only what its own website publishes: name, type, area, street, website link, directions. No photos of the business itself (the labelled type example above is the only picture), no prices, phone or WhatsApp. Keep `source_url` and `checked` on every entry.
- Never invent a fact about a business, a fixture, a price or a date. If it is not confirmed, leave it out.
- KaribuFans is independent. Do not use CAF, tournament, Uber or Bolt logos or imply affiliation. Tournament dates are not shown until confirmed.
- KaribuFans does not sell tickets and never handles payment (Marx confirmed, 9 Oct). Tickets link to official or partner event pages, with a referral code where the partner offers one.
- Never copy photos from a business's website. A business's own photos appear only once it joins and supplies them.
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
- Lead: called **Kiongozi** (Swahili for "leader"; the name Marx gave the lead). Holds this brief, splits the work, checks results, and is the only one who commits and pushes.
- Builder: changes `templates/`, `static/` and `data/`. One builder at a time per file.
- Listings researcher: adds venues under the content rules above.
- Reviewer: did not write the change. Rebuilds, loads every page at desktop and phone width, checks links, keyboard use and reduced motion, and checks the change against this brief.

Nothing is pushed until the reviewer has passed it. Marx chose commits straight to `main`, which is the live site, so a push is a release.

## Open items (Marx to supply)
- Commission terms for businesses (rate, what counts as a referral) before the first one joins
- `uber_client_id` in `data/site.json`
- Registered business name for the footer
- Own photographs from the Nairobi photo walk to replace stock where possible (Karen, Gigiri, Thika Road, Airport and Mombasa Road, Ngong Road and a real hotel room have none yet)
- Visitor accounts: built, hidden behind `accounts.live`. Before switching on: Supabase table and address settings, Google sign-in credential, an email sending service for sign-in links, and a live test by Marx
