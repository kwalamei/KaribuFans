# Website build plan and hosting options (29 September 2026)

Status: proposal for Marx's decision. Launch target: soft launch Thursday 15 October 2026.

## 1. Options

| | A. Website builder (Wix, Webflow, Squarespace) | B. Custom code: Astro + Tailwind, hosted on Vercel or Cloudflare Pages (recommended) | C. WordPress with a custom theme |
|---|---|---|---|
| Matches our designs | Partly; the designs would be rebuilt by hand in the builder | Fully; built straight from the canvas designs | Mostly, with theme work |
| Who builds | Marx, by hand | Claude writes the code; Marx reviews | A developer, or Claude plus hosting setup |
| Vendor listings | Builder's own database | Data file first, then a small database (e.g. Supabase) | WordPress posts or a plugin |
| Running cost at launch | Monthly plan | Free hosting tiers are normally enough at launch [confirm current plan limits when signing up] | Hosting plan |
| Lock-in | High | Low; the code is yours | Medium |
| Speed to 15 Oct | Medium | Fast, because the design work is done | Medium |

Recommendation: Option B. The designs are already built as components (navigation, page hero with route bar, vendor card, footer), and they translate directly into code. Mobile layouts come with the build: the pages are made responsive as they are coded, so the separate "mobile drawing" step becomes a phone test.

## 2. What the site does at launch (version 1)

1. Homepage and seven pages: Stays, Food, Rides, Matchday, Nightlife, Movies & Games, Tickets.
2. Listings come from one data file per module, so adding a vendor is a small edit, not a design change.
3. Contact buttons open WhatsApp with a pre-filled message ("Hi, I found you on KaribuFans…"), so vendors can see which customers came from us. This is how the commission model is tracked in version 1.
4. Rides buttons open Uber with the destination filled in. The Bolt link method is still to be confirmed.
5. Vendor sign-up form, stored so we can review applications.
6. Privacy notice and terms (Kenya Data Protection Act 2019); check whether registration with the Office of the Data Protection Commissioner applies to us.
7. A single setting switches the homepage between "everyday Nairobi" (default, for locals) and "tournament mode" (nearer June 2027).
8. English first; French, Arabic and Portuguese after launch.

## 3. Build order

| Day | Work | Owner |
|---|---|---|
| 1 | Project set up; colours, fonts and shared components coded; homepage built | Claude |
| 2–3 | Seven module pages driven by the data files; filters | Claude |
| 4 | Vendor sign-up form; WhatsApp and ride links | Claude |
| 5 | Private preview link so Marx can test on his phone before the domain is ready | Claude, with Marx's hosting account |
| Week 2 | Real listings, privacy notice and terms, fixes, final photos | Both |

The working name can be used for the build; swapping the name later is a single change in one settings file.

## 4. What Marx needs to do

1. Approve Option B (or choose another).
2. Create free accounts: GitHub (to store the code) and Vercel or Cloudflare (to host it). Marx keeps the logins; Claude never needs the passwords.
3. Choose the name and register the domain when ready; it connects to the site at the end.
4. Start the vendor list for each module (name, area, WhatsApp number, price range, photos, permission to list).
