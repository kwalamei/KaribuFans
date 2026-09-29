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


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def main():
    site = load("site.json")
    modules = load("modules.json")
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
    common = dict(site=site, modules=modules, year=date.today().year)

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "static", DIST)

    def write(path, html):
        out = DIST / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")

    home_look = "day"
    write("index.html", env.get_template("index.html").render(root="./", look=home_look, active="", **common))

    for m in modules:
        f = ROOT / "data" / "listings" / f"{m['slug']}.json"
        listings = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
        html = env.get_template("module.html").render(root="../", look=m["look"], active=m["slug"], m=m, listings=listings, **common)
        write(f"{m['slug']}/index.html", html)

    simple = [
        ("list-your-business", dict(eyebrow="For Nairobi businesses", title="List your business", body="The sign-up form is being built and will be ready before launch. No listing fee: you pay a commission only on customers we send you.")),
        ("privacy", dict(eyebrow="Legal", title="Privacy notice", body="Draft in progress. It will explain what we collect, why, and your rights under Kenya's Data Protection Act, 2019.")),
    ]
    for slug, page in simple:
        write(f"{slug}/index.html", env.get_template("simple.html").render(root="../", look="day", active="", page=page, **common))

    print("Built", sum(1 for _ in DIST.rglob("*.html")), "pages into", DIST)


if __name__ == "__main__":
    main()
