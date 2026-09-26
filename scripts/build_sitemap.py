#!/usr/bin/env python3
"""Regenerates sitemap.xml with every live devlog entry and project, so Google finds them as soon as
they're published. Run automatically by .github/workflows/update-feed.yml every hour (which also picks
up entries that were scheduled for later); can be run by hand too:

    python3 scripts/build_sitemap.py

Uses only the public key already in assets/js/config.js: the database only hands back live content."""
import datetime
import json
import pathlib
import re
import urllib.request
import xml.sax.saxutils as saxutils

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = (ROOT / "assets" / "js" / "config.js").read_text()
SUPABASE_URL = re.search(r"supabaseUrl:\s*'([^']+)'", CFG).group(1)
KEY = re.search(r"supabaseKey:\s*'([^']+)'", CFG).group(1)
SITE = "https://seventhboar.com"


def fetch(table):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{table}?select=slug,published_at&order=published_at.desc&limit=1000",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=30) as res:
        rows = json.loads(res.read().decode("utf-8"))
    now = datetime.datetime.now(datetime.timezone.utc)
    live = []
    for r in rows:                      # belt and braces: never list something dated in the future
        # drop fractional seconds: older Pythons can't parse an odd number of digits ("...07.47+00:00")
        stamp = re.sub(r"\.\d+", "", r["published_at"]).replace("Z", "+00:00")
        when = datetime.datetime.fromisoformat(stamp)
        if when <= now:
            live.append(r)
    return live


def day(value):
    return (value or datetime.date.today().isoformat())[:10]


def main():
    posts, projects = fetch("journal_posts"), fetch("projects")
    # No lastmod on the fixed pages, so the file only changes when the content does.
    urls = [(f"{SITE}/", None, "1.0"), (f"{SITE}/services/", None, "0.9"), (f"{SITE}/work/", None, "0.9"), (f"{SITE}/request/", None, "0.8"),
            (f"{SITE}/devlog/", None, "0.8"), (f"{SITE}/about/", None, "0.6"), (f"{SITE}/contact/", None, "0.6"),
            (f"{SITE}/privacy/", None, "0.3")]
    urls += [(f"{SITE}/project/?id={p['slug']}", day(p["published_at"]), "0.8") for p in projects]
    urls += [(f"{SITE}/post/?id={p['slug']}", day(p["published_at"]), "0.7") for p in posts]

    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod, pri in urls:
        lastmod = f"<lastmod>{mod}</lastmod>" if mod else ""
        out.append(f"  <url><loc>{saxutils.escape(loc)}</loc>{lastmod}<priority>{pri}</priority></url>")
    out.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(out) + "\n")
    print(f"sitemap.xml written with {len(urls)} URLs ({len(projects)} projects, {len(posts)} entries)")


if __name__ == "__main__":
    main()
