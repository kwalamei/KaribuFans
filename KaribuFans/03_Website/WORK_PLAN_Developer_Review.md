# Work plan: independent developer review (16 Oct 2026)

For the next working session on KaribuFans. Read `CLAUDE.md` at the repository root first; its rules are absolute and win over anything here.

**Source.** An independent consultant developer reviewed the live site and the source at revision `25b24f3` (16 Oct 2026) and gave Marx a 4-page summary. Kiongozi (the lead) checked the main findings against the code on 16 Oct. "Confirmed" below means the defect was seen in the code, not only taken from the report.

**Since that revision.** Two changes went live after `25b24f3` and were not in the consultant's scope: `84c4103` (own Nyayo photos on Matchday) and `31dcdd1` (Matchday match cards, switched off). Run the same checks over them.

**How to work.** These are the brief's team rules. One branch per batch. A builder makes the change and a reviewer who did not write it checks it: rebuild, every page at phone and desktop width, keyboard, reduced motion, and the brief. Kiongozi merges to `main` only after the reviewer passes it and Marx has seen the private preview. Marx previews in Claude; the preview steps are in "Private preview for Marx" below.

## Batch 1: now (navigation and data safety)

| ID | Problem | Status | Where | Done when |
|---|---|---|---|---|
| F01 | On a landscape phone (about 844 x 390) the open full-screen menu's labels overlap: flex items shrink below their text height. | Plausible; reproduce first | `static/css/site.css` (the `@media (max-width:1199px)` `.nav-links` rules, about lines 166-171) | No overlap at 844x390, 667x375 or 568x320. The menu scrolls. Tab, Escape and focus return still work. |
| F02 | On phones (760px and narrower) the route-bar labels are `display:none`, so six of the seven route links have no accessible name. | **Confirmed** (`site.css:294`, `templates/partials/macros.html:22`) | as listed | Every route link has a name: a visually hidden label or `aria-label` "Stop N: Label". Check with Playwright's accessibility snapshot. |
| F03 | A listing with no `status` silently becomes `joined` (`build.py:280`, `setdefault`), which would show a false "Verified" state. Duplicate IDs are not rejected. | **Confirmed** | `build.py` | The build fails with a clear message on a missing or unknown status, a duplicate id across all listing files, or a missing field for the record's status (unclaimed needs `source_url` and `checked`; joined needs what the joined card shows). Test each with a bad fixture. All 70 current listings are `unclaimed`, with no duplicates. |
| F04 | `static/js/site.js` defines `isOpen` twice in one scope: the menu helper (line 106, `var isOpen`) overrides the opening-hours function (line 153). Dormant today, because no listing has hours. | **Confirmed** | `static/js/site.js` | Rename them, for example `menuIsOpen` and `openNow`. A small test covers Nairobi daytime and overnight hours (for example 22:00 to 02:00) and the boundaries. |
| F09 | `.sr-only` text clipped outside the scroll width makes the privacy page 2px wider than a 320px screen. | Plausible | `site.css` | No horizontal overflow at 320px on any page. |

## Batch 2: before accounts go live (`accounts.live` stays false until all of this passes)

| ID | Problem | Status | Done when |
|---|---|---|---|
| F05 | In `static/js/account.js` (about line 223), a call that times out resolves `null`, but the real request keeps going. It can land after a later removal, so a removed place can come back on the next sync. | **Confirmed** (by reading the code) | Keep the latest intended state per place until uncertain writes are reconciled (for example, re-assert removals after a timed-out save). Add a stand-in test where a slow save finishes after a delete. |
| F06 | `?preview=accounts` links to an accounts privacy section that is not published while `live` is false. | Plausible; check `build.py` (about line 239) | The preview links only to published text, or the preview shows the accounts notice. |
| none | Live checks that only Marx can run, on the real site: Google sign-in, logout, cross-device sync, account deletion; two test users cannot see each other's places; a signed-out user is refused. | Needs Marx | Marx confirms each, then `live` goes true with a reviewer pass. |

Google-only sign-in is already prepared. Email stays off until custom email sending (SMTP) is set up in Supabase.

## Batch 3: release safety (choose an approach with Marx)

| ID | Problem | Recommendation |
|---|---|---|
| F07 | Vercel serves the committed `dist/` with no build step, and the root `.gitignore` ignores `dist`, so a new page can be left out or stale output published. Marx chose this setup on purpose: plain files, no build service. | Keep the setup. Add a GitHub Action that runs `pip install jinja2==<pinned>`, then `python3 build.py`, then `git diff --exit-code` on `dist/` plus a check for untracked files in `dist/`. Every push then fails loudly if `dist/` does not match the source. Pin Jinja2 in a `requirements.txt`. |
| F12 | The content-security policy is report-only. | Later: test it as enforced on a preview, then switch. Keep the Supabase SDK version pinned, with integrity checking if possible. |

## Batch 4: next iteration

- **F08 (conversion).** On Stays at 390px, filters start about 1,580px down the page and the first listing about 2,165px down. Add a "Browse stays" jump link near the title, move the filters up, and consider putting the photo gallery after the results. Keep the gallery caption saying the photos are not of the places listed. Marx to approve the layout in the preview.
- **F10.** Later, one validated dataset should generate cards, search, counts, the sitemap and any future per-business pages.
- **F11.** Only an allow-listed set of fields goes into the public HTML and JSON. Internal research notes such as `near_check` currently reach `dist/stays/index.html`; keep them out.

## Business items (Marx, not code)

- Commission terms in writing before charging any business: rate, what counts as a referral, attribution window, cancellations and disputes, settlement. Prove one referral end to end with a simple ledger. A click is not a paid booking.
- `uber_client_id`, then test the ride hand-off on real iOS and Android phones.
- Permission from the FKF to list fixtures (the draft email is in `KaribuFans/01_Strategy/Nairobi_Fixtures_Research.md` on branch `fixtures-research`). Then switch `data/fixtures.json` live and add the Police Sacco and Ulinzi stadiums with sourced facts.

## Where the consultant's advice conflicts with Marx's decisions

- "Build in deployment" (F07): Marx chose committed `dist/` with no build step. The CI check above gives the same safety without changing that.
- "Add a CMS": not now. The consultant agrees: only when editing needs justify it.

## Private preview for Marx

Build a copy of the site folder in the scratchpad, with `KF_FIXTURES_PREVIEW=1` if the match cards should show. Rewrite folder links to `index.html` (inside Claude the preview does not open folder addresses on its own). Publish it as a private Artifact and send Marx the link. The last session used https://claude.ai/artifact/VEeNfsCZAz26mEMZdWBy2Z. A new session may need to publish its own.
