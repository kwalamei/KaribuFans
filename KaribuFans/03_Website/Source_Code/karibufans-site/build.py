"""Build the KaribuFans site into dist/.

Usage:  python3 build.py
Needs:  Python 3 with Jinja2 (pip install jinja2)

Edit content in data/ (site settings, modules, listings) and design in
templates/ and static/. Never edit dist/ by hand: it is regenerated.
"""
import json
import shutil
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


def zone_key(z):
    return (ZONE_ORDER.index(z) if z in ZONE_ORDER else len(ZONE_ORDER), z)


def main():
    site = load("site.json")
    modules = load("modules.json")
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
    rides = load("rides.json")
    fixtures = load("fixtures.json")

    # Load every listing once, so pages can link to each other by area.
    listings = {}
    for m in modules:
        f = ROOT / "data" / "listings" / f"{m['slug']}.json"
        items = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
        for v in items:
            v.setdefault("zone", v.get("area", ""))
            v.setdefault("status", "joined")
        listings[m["slug"]] = items
        m["count"] = len(items)
        m["zones"] = sorted({v["zone"] for v in items if v["zone"]}, key=zone_key)
        m["types"] = sorted({v["type"] for v in items if v.get("type")})

    # route[slug][zone] = number of listings; used for "continue your route" links.
    route = {slug: {} for slug in listings}
    for slug, items in listings.items():
        for v in items:
            route[slug][v["zone"]] = route[slug].get(v["zone"], 0) + 1
    zones = sorted({z for r in route.values() for z in r}, key=zone_key)
    zone_cards = [{"name": z, "counts": [(m["label"], m["slug"], route[m["slug"]].get(z, 0)) for m in modules if route[m["slug"]].get(z)]} for z in zones]

    common = dict(site=site, modules=modules, rides=rides, fixtures=fixtures, year=date.today().year,
                  route=route, zone_cards=zone_cards)

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "static", DIST)

    def write(path, html):
        out = DIST / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")

    def page(template, path, root="../", active="", **kw):
        write(path, env.get_template(template).render(root=root, active=active, **common, **kw))

    page("index.html", "index.html", root="./")

    index = []
    for i, m in enumerate(modules):
        items = listings[m["slug"]]
        for v in items:
            index.append({"id": v.get("id", ""), "page": m["slug"], "page_label": m["label"], "name": v["name"],
                          "type": v["type"], "area": v["area"], "street": v.get("street", ""), "tags": v.get("tags", [])})
        prev_m = modules[i - 1] if i > 0 else None
        next_m = modules[i + 1] if i + 1 < len(modules) else None
        page("module.html", f"{m['slug']}/index.html", active=m["slug"], m=m, listings=items, prev_m=prev_m, next_m=next_m)

    (DIST / "search-index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    page("search.html", "search/index.html")
    page("join.html", "list-your-business/index.html")
    page("privacy.html", "privacy/index.html")

    print("Built", sum(1 for _ in DIST.rglob("*.html")), "pages into", DIST)


if __name__ == "__main__":
    main()
