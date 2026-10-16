# Nairobi league fixtures: research for the Matchday page

Prepared 16 Oct 2026 for Marx and Kiongozi. This is research only. Nothing on the site has changed.

**How this was checked.** This workspace could not open any web page: footballkenya.org, the news sites and the data providers were all refused by the network. Every fact below comes from **web search results** (titles and snippets), not from reading the page. Labels:
- **[official, snippet]**: the result is on an FKF domain, but only the search snippet was seen
- **[snippet]**: from a news or third-party search result
- **[unverified]**: inferred, conflicting, or not found

Nothing here is "confirmed on official page". Before anything is built, someone with normal internet access should open each official link.

---

## 1. Official sources

| Source | What it is | Current for 2026/27? |
|---|---|---|
| footballkenya.org/sportpesa-league | FKF's own top-flight page. The league is branded the **SportPesa League**. It has fixtures, results and a table at `/sportpesa-league/table` | Yes. The 2026/27 table showed one matchday played (Gor Mahia, Tusker, Kakamega Homeboyz and Shabana on 3 points) [official, snippet] — https://footballkenya.org/sportpesa-league/table |
| footballkenya.org/womens-premier-league, wpl.footballkenya.org | FKF Women's Premier League | The 2026/27 table showed 3 games played. The wpl subdomain shows different, older-looking numbers [official, snippet] — https://footballkenya.org/womens-premier-league |
| footballkenya.org/national-super-league | Second tier | Indexed as 2025/26 [official, snippet] |
| fkfleagues.co.ke | Fixtures and results site for county and sub-county leagues. It has one 2025/26 Premier League fixture page (Gor Mahia 1-0 AFC Leopards) | The results seen are past seasons. Who runs it is not stated in the snippets [unverified] — https://www.fkfleagues.co.ke/fixture/53376/Gor-Mahia-vs-AFC-Leopards |
| tickets.footballkenya.org | — | **Not found** in search. FKF ticket notices from 2025 sent buyers to tikiti.co.ke and USSD *519*55#, with no gate sales [official, snippet] — https://footballkenya.org/?p=59211, https://footballkenya.org/?p=58999 |
| FKF social media | — | The official handle could **not** be confirmed. One result credited a photo to the FKF president's personal account (@husseinmoha), not to the federation [snippet] — https://peopledaily.digital/sports/premier-league-fixtures-shelved-as-restructuring-of-fkf-new-office-intensifies |
| Club sites | For example afcleopards.co.ke (it has event pages for matches) | Not checked for 2026/27 [unverified] — https://afcleopards.co.ke/event/gor-mahia-vs-afc-leopards/ |

**"kenyanpremierleague.com"**: no search result for this domain. Nothing shows it exists or is official. **Do not use it.**
- The old operator, Kenyan Premier League Limited, used **kpl.co.ke**. An old Wikipedia mirror lists that domain [snippet].
- FKF took over running the league on 24 Sep 2020 [snippet] — https://en.wikipedia.org/wiki/Kenyan_Premier_League
- In May 2026 the clubs set up a "Transition League Management Committee", chaired by Ambrose Rachier, to work toward a more independent league "within the FKF framework" [snippet] — https://capitalfm.africa/is-kpl-on-its-way-back-kenyan-top-tier-league-clubs-out-to-manage-2026-27-season/ ; https://citizen.digital/article/ambrose-rachier-led-committee-formed-to-plan-new-kpl-season-n386998
- So a club-run "KPL" site could appear later. Treat any such site as unofficial until FKF links to it.

**How we know footballkenya.org is official:**
- English Wikipedia names it as the league's website [snippet].
- Its homepage title in search is "Football Kenya Federation: Official Website" [official, snippet].

Neither is proof. Confirm with FKF directly (see the email in section 7).

## 2. Terms of use
- **footballkenya.org: not found.** Searches turned up no terms of use, copyright notice, privacy policy or robots.txt for the site. The site could not be opened to check its footer.
- **fkfleagues.co.ke: not found.** Its only contact shown is info@fkfleagues.co.ke [snippet].
- No legal conclusion is drawn here. **Marx should ask FKF:**
  1. Can KaribuFans list fixtures (teams, date, kick-off time, venue) with a link back to FKF?
  2. Is automated collection allowed, or only manual entry?
  3. Can KaribuFans use the competition name "SportPesa League"?
  4. Are club names allowed without badges? (No badges either way: brief rule)
  5. Which ticket sellers are official for each club?
- The sponsor name is a trademark question as well. **SportPesa** is a betting brand [snippet] — https://eastleighvoice.co.ke/fkf%20premier%20league/212143/inside-fkf-s-sh1-12-billion-sponsorship-deal-with-sportpesa. Marx may prefer the neutral "Kenyan Premier League (FKF)" on cards.

## 3. Nairobi venues, 2026/27 so far
Round 1 ran 9–14 Oct 2026. Venues used in Nairobi:

| Venue | Matches and clubs seen in 2026/27 | Zone | In stadiums.json? |
|---|---|---|---|
| **Police Sacco Stadium**, South C | Home of Kenya Police FC (Wikipedia) [snippet]. Round 1 games there: Mathare United 0-0 APS Bomet on 10 Oct [snippet]; Nairobi United v KCB [snippet]; AFC Leopards 0-0 Bandari on 14 Oct, "at Police Sacco Grounds" [snippet] — https://eastleighvoice.co.ke/football/412156/afc-leopards-stumble-as-bandari-hold-ingwe-to-goalless-draw-in-fkf-season-opener ; https://www.the-star.co.ke/news/2023-02-03-photos-ruto-commissions-police-sacco-stadium | South C is off Mombasa Road, so **Airport & Mombasa Road** (our judgement) | **Add** |
| **Ulinzi Sports Complex**, Lang'ata Barracks | Home of Ulinzi Stars [snippet]. Ulinzi Stars v Tusker, 11 Oct [snippet]. It also hosted the abandoned Kariobangi Sharks v Mombasa United playoff on 6 Oct [snippet] — https://capitalfm.africa/president-kenyatta-to-officially-open-ulinzi-sports-complex-in-langata/ ; https://k24.digital/sports/kpl/fkf-premier-league-4-matches-on-the-cards-for-sunday-action | **Lang'ata** | **Add**. It is a military site, so check the visitor entry rules |
| **Nyayo National Stadium** | Gor Mahia 4-2 Murang'a SEAL, 13 Oct, 5,340 tickets sold [snippet] — https://www.standardmedia.co.ke/sports/article/2001560075/gor-mahia-launch-title-defence-with-4-2-victory-over-murang-a-seal ; https://www.standardmedia.co.ke/sports/article/2001560080/gor-mahia-collect-sh1-69-million-in-ticket-sales-from-floodlit-season-opener | CBD (already set) | Yes |
| **Kasarani (MISC)** | Main stadium and both annexes closed from Feb 2026 for AFCON upgrades [snippet] — https://k24.digital/sports/blow-to-kpl-clubs-as-kasarani-stadium-closed-for-upgrades-ahead-of-afcon-2027/amp . No 2026/27 league match found there | Thika Road | Yes. Keep it, but show no fixtures there unless FKF lists one |
| **Kasarani Annex** | Third-party data lists KCB home games there from Jan to May 2026 (2025/26 season), despite the closure [snippet, conflicting] — https://livesoccer.planetsport.com/live/soccer/match-detail/kenya-premier-league-kcb-vs-tusker-fc/2026-01-25/3101944/overview . Nothing found for 2026/27 | Thika Road | Add only if a 2026/27 fixture is listed there |
| **Dandora Stadium** | Nairobi United's home in 2025/26, about 5,000 seats [snippet] — https://peopledaily.digital/sports/nairobi-united-confirm-venue-for-gor-mahia-clash . Nothing found for 2026/27 | Nairobi (Eastlands), outside the current zones | Add only if used. It would need a new zone or "outside our zones" |

**Nairobi clubs** in 2026/27 [snippet, from the Round 1 fixtures]: Gor Mahia, AFC Leopards, Tusker, KCB, Kenya Police, Nairobi United, Mathare United, Posta Rangers and Ulinzi Stars. Posta Rangers played at home in Wang'uru, Kirinyaga, which is outside Nairobi.
- Home grounds for Gor Mahia, AFC Leopards, Tusker and KCB this season are **not confirmed**. Clubs choose the venue match by match.
- The Kenyatta Stadium in Machakos and the other Round 1 grounds (Wang'uru, Embu, Awendo) are not in Nairobi. Leave them out.
- Talanta is not open yet (stadiums.json already says so).

**Other competitions:**
- FKF Women's Premier League: Police Bullets and Ulinzi Starlets are Nairobi-area clubs [official, snippet]. A possible later addition.
- FKF Cup, national-team matches and CAF club games in Nairobi are relevant only if Marx wants them. Leave them out at launch.

## 4. How reliable are fixture announcements this season
- **The season start moved four times.**
  - First release: 29–30 Aug [snippet] — https://capitalfm.africa/gor-v-muranga-leopards-v-bandari-fkf-release-2026-27-premier-league-fixtures/
  - Postponed over 31 Aug–2 Sep [snippet] — https://citizen.digital/article/fkf-postpones-premier-league-opening-fixtures-amid-promotion-relegation-standoff-n389230
  - 19 Sep start cancelled hours before kick-off after court orders [snippet] — https://k24.digital/sports/kpl/fkf-postpones-kenyan-premier-league-kick-off-after-fresh-court-order
  - Kick-off finally on 9–10 Oct [snippet]
- **Venues were "to be confirmed" five days out.** The Round 1 schedule (5 Oct) listed Gor v Murang'a and AFC Leopards v Bandari with no venue [snippet] — https://capitalfm.africa/its-kick-off-time-as-fkf-releases-dates-and-fixtures-for-premier-league-match-day-1/
- **Matches moved at short notice.**
  - Gor v Murang'a moved from Sat 10 Oct, 4pm, to Tue 13 Oct, 7pm, at Nyayo [snippet] — https://k24.digital/sports/kpl/gor-mahia-confirm-previously-purchased-tickets-remain-valid-for-muranga-seal-clash
  - In Feb 2026 Nairobi United moved a game from Ulinzi to Kasarani Annex [snippet] — https://k24.digital/sports/nairobi-united-confirm-change-of-venue-for-bidco-fkf-pl-clash/amp
- **Sources disagree.**
  - Nairobi United v KCB is reported as Fri 9 Oct (Capital FM) and as Sun 11 Oct (K24).
  - 365scores placed AFC Leopards v Bandari at Nyayo and marked it "Abandoned". The news reports say Police Sacco, 0-0 [snippet] — https://www.365scores.com/football/match/premier-league-5575/afc-leopard-bandari-12878-13320-5575
- **The league line-up is still disputed.** FKF ruled Sharks forfeited the playoff on 9 Oct [snippet] — https://www.pulsesports.co.ke/story/kariobangi-sharks-pay-heavy-penalty-for-playoff-chaos-as-mombasa-united-earn-premier-league-promotion-2026101005552076005 . Whether there is an appeal is unknown.
- **Round 2 dates had not shown up in search by 16 Oct** [unverified].

**Recommended rule: "confirmed enough" to show**
1. Show a fixture only once **FKF**, or **the home club's official channel**, lists the date, kick-off time and a named Nairobi venue. A media report alone is not enough. A data aggregator is never enough.
2. If the venue is TBC, do not show the fixture. If only the time is TBC, show the date and "Time to be confirmed".
3. Re-check at least 48 hours before kick-off and again on matchday morning. Every card carries a line such as "Check the official page before you travel", linking to `source_url`.
4. Show nothing beyond the next 14 days.

## 5. Data providers (all unverified for Kenya)

| Provider | Kenya top flight? | Price (as published) |
|---|---|---|
| API-Football (api-sports) | A blog tag says Kenya was added. The coverage list could not be opened [unverified] — https://www.api-football.com/news/tag/kenya | Free: 100 requests/day. Pro: $19/month for 7,500/day. Ultra: $29. Mega: $39 [snippet, from the provider's own guide] — https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide . It says the free plan covers "recent seasons" only |
| Sportmonks | No result mentions Kenya. It claims 2,300+ leagues [unverified] | Starter €29/month for 5 leagues; Growth €99; Pro €249; 14-day trial [snippet] — https://www.sportmonks.com/football-api/plans-pricing |
| ESPN, Sofascore, 365scores, Flashscore | Show Kenyan fixtures, but are consumer sites with no data licence for us | — . 365scores showed a wrong venue (section 4) |

No provider is a primary source. They copy FKF and can be wrong or late on **venue**, which is the one field our cards depend on (the stadium photo).

## 6. Recommendation

**Option A: weekly manual entry, from FKF or club pages.**
- The listings researcher works from FKF or club pages, with `source_url` and `checked` on every fixture.
- Zero cost, and no permission question about scraping.
- It applies the "confirmed enough" rule above.
- Volume is small: about 4–6 Nairobi matches a week.

**Option B: an automated provider feed, with a scheduled job.**
- The key would be kept as a GitHub secret and never put in the site.
- Coverage is unverified, the venue data is weak, and it still needs a person to check each fixture.
- It adds cost and a licence question.

**Recommend A at launch.** Revisit B only if FKF offers a feed or the scope grows beyond Nairobi.

**Proposed `data/fixtures.json`:**
```json
[
  {
    "id": "2026-27-kpl-gor-mahia-v-muranga-seal",
    "competition": "kpl",
    "competition_label": "Kenyan Premier League (FKF)",
    "season": "2026/27",
    "round": 1,
    "home": "Gor Mahia",
    "away": "Murang'a SEAL",
    "date": "2026-10-13",
    "kickoff_local": "19:00",
    "venue_id": "nyayo",
    "status": "played",
    "status_note": "Moved from 10 Oct",
    "source_url": "https://footballkenya.org/sportpesa-league",
    "checked": "13 Oct 2026",
    "ticket_url": null
  }
]
```
- `status` takes one of these values:
  - `scheduled`
  - `time_tbc`
  - `postponed`
  - `moved` (new date or venue)
  - `played`
  - `abandoned`
  - `cancelled`
- Leave `kickoff_local` empty when the time is TBC.
- Never store scores. We are a guide, not a results service.
- `ticket_url` is only for an official club, FKF or partner page that sells tickets **for that match**. We never sell tickets ourselves.

**Past and postponed matches:**
- At build time, hide anything whose date has passed (Africa/Nairobi time). Delete played matches at the next weekly update.
- A `postponed` match stays on its card for 7 days, marked "Postponed, new date not announced", and then drops off.
- A `moved` match keeps the same `id`, with new date and venue fields and a short `status_note`.
- If `venue_id` is not one of the Nairobi venues, the build skips the fixture.
- **New `stadiums.json` entries needed now:**
  - `police-sacco`: Police Sacco Stadium, South C, Airport & Mombasa Road zone
  - `ulinzi`: Ulinzi Sports Complex, Lang'ata zone
  - Later, if used: `kasarani-annex` and `dandora`
- **Photos:** none of the new venues has a photo in the photo library. Card photos need licensed or own shots. No visible club badges, sponsor boards or readable signs.

## 7. Draft email to FKF

> **Subject:** Request to list Nairobi league fixtures on KaribuFans, with links to FKF
>
> Dear FKF Communications team,
>
> I run KaribuFans, an independent Nairobi city guide for visitors and residents. It launched on 15 October 2026. We would like to list upcoming FKF Premier League and Women's Premier League matches played in Nairobi: teams, date, kick-off time and venue. Each match would link back to footballkenya.org as the official source, alongside directions to the stadium. We would not use club or FKF logos, and we do not sell tickets.
>
> Could you tell us:
> 1. Whether we may list fixtures in this way, and any credit or wording you require.
> 2. Whether FKF offers a fixtures feed or list (for example a spreadsheet or calendar) that we may use, and whether automated reading of footballkenya.org is allowed.
> 3. Which ticket pages are official for league matches, so we can link fans only to genuine sellers. If FKF or clubs run a referral scheme, we would be glad to hear of it.
> 4. Who to contact for late venue or date changes.
>
> Thank you for your time.
>
> Marx
> KaribuFans
