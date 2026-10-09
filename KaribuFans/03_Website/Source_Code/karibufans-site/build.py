"""Build the KaribuFans site into dist/.

Usage:  python3 build.py
Needs:  Python 3 with Jinja2 (pip install jinja2)

Edit content in data/ (site settings, modules, listings) and design in
templates/ and static/. Never edit dist/ by hand: it is regenerated.
"""
import json
import shutil
import zlib
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).parent
DIST = ROOT / "dist"

# Order in which areas appear in every Area filter and on the homepage.
ZONE_ORDER = ["Kilimani", "Westlands", "CBD", "Karen", "Ngong Road", "Lang'ata",
              "Airport & Mombasa Road", "Gigiri & Limuru Road", "Thika Road"]


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


# Gallery photos the design leaves out on a page although the manifest lists them there
# (the jacaranda street reads weakly among the ride photos; it stays in the homepage gallery).
# A stop's gallery also skips the photo that is already that page's hero, so no page shows one photo twice.
GALLERY_DROP = {"rides": {"jacaranda-street", "avenue-traffic"}}
# Photos the design adds to a page's gallery. avenue-traffic was re-cropped to buildings only (no road), so it sits
# with the stays photos rather than the rides ones.
GALLERY_ADD = {"stays": ["avenue-traffic"]}


def load_photos():
    """Read data/photos.json (written by tools/photos.py) and add what the templates need: each photo's id
    and its ratio as numbers, so every <img> gets a width and height. templates/partials/photo.html does the rest."""
    f = ROOT / "data" / "photos.json"
    if not f.exists():
        return {"photos": {}, "slots": {}, "galleries": {}, "examples": {}}
    man = json.loads(f.read_text(encoding="utf-8"))
    for pid, ph in man["photos"].items():
        ph["id"] = pid
        ph["rw"], ph["rh"] = (int(x) for x in ph["ratio"].split(":"))
        if ph.get("m"):
            ph["mw"], ph["mh"] = (int(x) for x in ph.get("m_ratio", "4:5").split(":"))
    for page, ids in man.get("galleries", {}).items():
        skip = GALLERY_DROP.get(page, set()) | ({man["slots"].get(page)} if page != "home" else set())
        ids = ids + [i for i in GALLERY_ADD.get(page, []) if i not in ids]
        man["galleries"][page] = [i for i in ids if i in man["photos"] and i not in skip]
    man.setdefault("examples", {})
    return man


def pick_examples(items, examples):
    """Trial (owner's request): an unclaimed listing with no photos of its own may show a stock photo of its TYPE of
    place, labelled "Example photo, not of this place" on the card. The photo is chosen from the listing id (a stable
    hash, so a rebuild gives the same page), then moved on to the next one of that type if one of the two cards
    before it on the page already shows it, so neighbouring cards vary. Types without examples keep the drawing."""
    recent = []
    for v in items:
        ids = examples.get(v.get("type"), [])
        if v.get("status") != "unclaimed" or v.get("photos") or not ids:
            continue
        n = len(ids)
        start = zlib.crc32(v.get("id", v["name"]).encode("utf-8")) % n
        avoid = recent[-min(2, n - 1):] if n > 1 else []
        k = next((ids[(start + j) % n] for j in range(n) if ids[(start + j) % n] not in avoid), ids[start])
        v["example"] = k
        recent.append(k)


def zone_key(z):
    return (ZONE_ORDER.index(z) if z in ZONE_ORDER else len(ZONE_ORDER), z)


def load_stadiums(site):
    """Read data/stadiums.json (the stadium guide on Matchday, and the "Near ..." labels and filters).
    The file is optional. Without it, a listing marked with the old near_stadium flag still gets a label
    from site.json tournament.stadium, so nothing breaks while the file is missing."""
    f = ROOT / "data" / "stadiums.json"
    items = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
    items = [s for s in items if s.get("id") and s.get("name")]
    for s in items:
        s.setdefault("short", s["name"])
        s.setdefault("aka", [])
        s.setdefault("map_query", s["name"] + ", Nairobi")
    if not any(s["id"] == "talanta" for s in items):
        name = site.get("tournament", {}).get("stadium") or "Talanta Stadium"
        # Not shown in the stadium guide (no source); used only to label listings that still carry near_stadium.
        items.append({"id": "talanta", "name": name, "short": name, "aka": [], "map_query": name + ", Nairobi",
                      "fallback": True})
    return items


def near_ids(v, known):
    """The stadiums a listing is near: the new "near" list, or the old near_stadium flag (which meant Talanta)."""
    ids = v.get("near")
    if isinstance(ids, str):
        ids = [ids]
    if not ids and v.get("near_stadium") is True:
        ids = ["talanta"]
    out = []
    for i in ids or []:
        if i in known and i not in out:
            out.append(i)
        elif i not in known:
            print(f"  warning: {v.get('id')}: near '{i}' is not in data/stadiums.json; ignored")
    return out


def main():
    site = load("site.json")
    modules = load("modules.json")
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
    rides = load("rides.json")
    fixtures = load("fixtures.json")
    photos = load_photos()
    stadiums = load_stadiums(site)
    stadium_by_id = {s["id"]: s for s in stadiums}

    # Load every listing once, so pages can link to each other by area.
    listings = {}
    for m in modules:
        f = ROOT / "data" / "listings" / f"{m['slug']}.json"
        items = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
        for v in items:
            v.setdefault("zone", v.get("area", ""))
            v.setdefault("status", "joined")
            v["near"] = near_ids(v, stadium_by_id)
            v["near_shorts"] = [stadium_by_id[i]["short"] for i in v["near"]]
            v["near_label"] = ("Near " + " and ".join(v["near_shorts"])) if v["near"] else ""
        pick_examples(items, photos["examples"])
        listings[m["slug"]] = items
        m["count"] = len(items)
        m["zones"] = sorted({v["zone"] for v in items if v["zone"]}, key=zone_key)
        m["types"] = sorted({v["type"] for v in items if v.get("type")})
        # Stadiums that have at least one listing on this page, in the order of data/stadiums.json.
        m["near"] = [{"id": s["id"], "short": s["short"], "count": sum(1 for v in items if s["id"] in v["near"])}
                     for s in stadiums if any(s["id"] in v["near"] for v in items)]

    # The stadium guide on Matchday lists only stadiums from data/stadiums.json (never the fallback), each with
    # the pages that have listings near it.
    for s in stadiums:
        s["pages"] = [{"slug": m["slug"], "label": m["label"], "noun": m.get("noun") or "places",
                       "count": sum(1 for v in listings[m["slug"]] if s["id"] in v["near"])}
                      for m in modules if any(s["id"] in v["near"] for v in listings[m["slug"]])]
    guide = [s for s in stadiums if not s.get("fallback")]

    # route[slug][zone] = number of listings; used for "continue your route" links.
    route = {slug: {} for slug in listings}
    for slug, items in listings.items():
        for v in items:
            route[slug][v["zone"]] = route[slug].get(v["zone"], 0) + 1
    zones = sorted({z for r in route.values() for z in r}, key=zone_key)
    zone_cards = [{"name": z, "counts": [(m["label"], m["slug"], route[m["slug"]].get(z, 0)) for m in modules if route[m["slug"]].get(z)]} for z in zones]

    # Every photo the site shows, in the order it first appears, for the credits on the privacy page.
    used = []
    for pid in list(photos["slots"].values()) + [i for ids in photos["galleries"].values() for i in ids]:
        if pid in photos["photos"] and pid not in used:
            used.append(pid)
    # Example photos on listing cards (a trial) are credited after them, in manifest order, if any card shows one.
    shown = {v["example"] for items in listings.values() for v in items if v.get("example")}
    used += [i for ids in photos["examples"].values() for i in ids if i in shown and i not in used]
    photo_credits = [photos["photos"][i] for i in used]

    # Ride destinations linked to a stadium take its coordinates from data/stadiums.json (never typed into rides.json),
    # so the Uber link can carry the drop-off point as well as its name.
    for d in rides.get("destinations", []):
        st = stadium_by_id.get(d.get("stadium"))
        if st and st.get("lat") is not None and st.get("lng") is not None:
            d["lat"], d["lng"] = st["lat"], st["lng"]

    common = dict(site=site, modules=modules, rides=rides, fixtures=fixtures, year=date.today().year, stadiums=guide,
                  route=route, zone_cards=zone_cards, photos=photos["photos"], slots=photos["slots"],
                  galleries=photos["galleries"], photo_credits=photo_credits)

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "static", DIST)

    def write(path, html):
        out = DIST / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")

    def page(template, path, root="../", active="", **kw):
        # The page's public address, for link previews and the canonical link: ".../stays/", not ".../stays/index.html"
        page_url = site["site_url"].rstrip("/") + "/" + (path[:-len("index.html")] if path.endswith("index.html") else path)
        write(path, env.get_template(template).render(root=root, active=active, page_url=page_url, **common, **kw))

    page("index.html", "index.html", root="./")

    # Search index (search/ page). Three kinds of entry: the stop pages (with keywords from modules.json),
    # the stadiums in the guide, and every listing (with the names of the stadiums it is near).
    # js/account.js reads the listing entries too (by id: page, name, type, area); pages and stadiums have no id.
    index = []
    stadium_words = " ".join(w for s in guide for w in [s["name"], s["short"]] + s["aka"])
    for m in modules:
        words = [m["label"], m["slug"], m.get("card_home", ""), m.get("sub", ""), " ".join(m.get("keywords", []))]
        if m["slug"] == "matchday":
            words.append(stadium_words)   # the stadium guide is on this page
        index.append({"kind": "page", "href": m["slug"] + "/", "name": m["label"], "page_label": "Stop " + str(m["stop"]),
                      "meta": m.get("card_home", ""), "text": " ".join(words)})
    index.append({"kind": "page", "href": "list-your-business/", "name": "List your business", "page_label": site["name"],
                  "meta": "Add or claim your business on " + site["name"] + ".",
                  "text": "list your business list listing add claim remove join vendor owner whatsapp contact restaurant hotel bar"})
    for s in guide:
        index.append({"kind": "stadium", "href": "matchday/#stadium-" + s["id"], "name": s["name"], "page_label": "Stadium guide",
                      "meta": "Matchday · " + (s.get("zone") or "Nairobi"),
                      "text": " ".join([s["name"], s["short"], " ".join(s["aka"]), s.get("zone", ""), s.get("street", ""),
                                        "stadium football matchday"])})
    for i, m in enumerate(modules):
        items = listings[m["slug"]]
        for v in items:
            near_names = [n for sid in v["near"] for n in [stadium_by_id[sid]["name"], stadium_by_id[sid]["short"]] + stadium_by_id[sid]["aka"]]
            index.append({"kind": "place", "id": v.get("id", ""), "href": m["slug"] + "/#place-" + v.get("id", ""),
                          "page": m["slug"], "page_label": m["label"], "name": v["name"], "type": v["type"], "area": v["area"],
                          "meta": m["label"] + " · " + v["type"] + " · " + v["area"] + (" · " + v["near_label"] if v["near"] else ""),
                          "text": " ".join([v["name"], v["type"], v["area"], v["zone"], v.get("street", ""), m["label"],
                                            " ".join(v.get("tags", [])), v["near_label"], " ".join(near_names)])})
        prev_m = modules[i - 1] if i > 0 else None
        next_m = modules[i + 1] if i + 1 < len(modules) else None
        page("module.html", f"{m['slug']}/index.html", active=m["slug"], m=m, listings=items, prev_m=prev_m, next_m=next_m)

    (DIST / "search-index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    page("search.html", "search/index.html")
    page("join.html", "list-your-business/index.html")
    # The notice that describes accounts is published only once accounts are open to everyone.
    page("privacy_accounts.html" if site.get("accounts", {}).get("live") else "privacy.html", "privacy/index.html")
    page("account.html", "account/index.html")
    # Vercel serves dist/404.html for any address it cannot find, at any depth, so its links start at the site root.
    page("404.html", "404.html", root="/")

    # robots.txt and sitemap.xml (no lastmod, so a rebuild on another day gives the same file). The sitemap lists the public pages only: not search (noindex), the account page
    # or the 404 page.
    base = site["site_url"].rstrip("/")
    public = [""] + [m["slug"] + "/" for m in modules] + ["list-your-business/", "privacy/"]
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{base}/{p}</loc></url>\n" for p in public)
        + "</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")

    print("Built", sum(1 for _ in DIST.rglob("*.html")), "pages into", DIST)


if __name__ == "__main__":
    main()
