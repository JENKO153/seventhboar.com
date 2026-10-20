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
import urllib.parse
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


def settings_pages():
    """Admin -> Pages: which built-in pages are switched off, and the live pages made there."""
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/site_settings?select=data&id=eq.1",
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=30) as res:
        rows = json.loads(res.read().decode("utf-8"))
    pages = ((rows[0].get("data") if rows else None) or {}).get("pages") or {}
    custom = [p for p in pages.get("custom") or [] if p.get("id") and p.get("status") == "published"]
    return set(pages.get("hidden") or []), custom


def main():
    posts, projects = fetch("journal_posts"), fetch("projects")
    hidden, custom = settings_pages()
    # No lastmod on the fixed pages, so the file only changes when the content does.
    fixed = [("/", "1.0", None), ("/services/", "0.9", "services"), ("/work/", "0.9", "work"), ("/request/", "0.8", None),
             ("/devlog/", "0.8", "devlog"), ("/about/", "0.6", "about"), ("/contact/", "0.6", "contact"), ("/privacy/", "0.3", None)]
    urls = [(f"{SITE}{path}", None, pri) for path, pri, key in fixed if key not in hidden]
    if "work" not in hidden:
        urls += [(f"{SITE}/project/?id={p['slug']}", day(p["published_at"]), "0.8") for p in projects]
    if "devlog" not in hidden:
        urls += [(f"{SITE}/post/?id={p['slug']}", day(p["published_at"]), "0.7") for p in posts]
    urls += [(f"{SITE}/p/?id={urllib.parse.quote(p['id'])}", None, "0.6") for p in custom]

    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod, pri in urls:
        lastmod = f"<lastmod>{mod}</lastmod>" if mod else ""
        out.append(f"  <url><loc>{saxutils.escape(loc)}</loc>{lastmod}<priority>{pri}</priority></url>")
    out.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(out) + "\n")
    print(f"sitemap.xml written with {len(urls)} URLs ({len(projects)} projects, {len(posts)} entries, {len(custom)} pages, hidden: {sorted(hidden) or 'none'})")


if __name__ == "__main__":
    main()
