#!/usr/bin/env python3
"""Regenerates devlog/feed.xml from the live Supabase journal_posts table.

Run on a schedule by .github/workflows/update-feed.yml -- keeps the RSS feed
(what a newsletter service polls to auto-email new devlog posts) in sync
with a site that otherwise has no build step. Uses the same public anon key
already embedded client-side in assets/js/config.js (read-only, RLS-gated).
"""
import datetime
import json
import os
import re
import urllib.request
import xml.sax.saxutils as saxutils

# The public URL and anon key live in one place: assets/js/config.js.
_CFG = open(os.path.join(os.path.dirname(__file__), "..", "assets", "js", "config.js")).read()
SUPABASE_URL = re.search(r"supabaseUrl:\s*'([^']+)'", _CFG).group(1)
SUPABASE_ANON_KEY = re.search(r"supabaseKey:\s*'([^']+)'", _CFG).group(1)
SITE_URL = "https://seventhboar.com"
FEED_PATH = os.path.join(os.path.dirname(__file__), "..", "devlog", "feed.xml")


def parse_dt(value):
    # drop fractional seconds: older Pythons can't parse an odd number of digits ("...07.47+00:00")
    import re
    return datetime.datetime.fromisoformat(re.sub(r"\.\d+", "", value).replace("Z", "+00:00"))


def rfc822(dt):
    return dt.strftime("%a, %d %b %Y %H:%M:%S %z")


def fetch_posts():
    url = (
        f"{SUPABASE_URL}/rest/v1/journal_posts"
        "?select=slug,title,excerpt,category,author,published_at"
        "&order=published_at.desc&limit=30"
    )
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as res:
        rows = json.loads(res.read().decode("utf-8"))
    now = datetime.datetime.now(datetime.timezone.utc)
    return [r for r in rows if parse_dt(r["published_at"]) <= now]


def build_feed(posts):
    items = []
    for p in posts:
        link = f"{SITE_URL}/post/?id={p['slug']}"
        items.append(f"""
    <item>
      <title>{saxutils.escape(p['title'])}</title>
      <link>{saxutils.escape(link)}</link>
      <guid isPermaLink="true">{saxutils.escape(link)}</guid>
      <pubDate>{rfc822(parse_dt(p['published_at']))}</pubDate>
      <author>{saxutils.escape(p.get('author') or 'Seventh Boar')}</author>
      <category>{saxutils.escape(p['category'])}</category>
      <description>{saxutils.escape(p['excerpt'])}</description>
    </item>""")

    now = datetime.datetime.now(datetime.timezone.utc)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Seventh Boar Development — Devlog</title>
    <link>{SITE_URL}/devlog/</link>
    <description>Devlog entries, development notes, and studio writing from Seventh Boar Development.</description>
    <language>en-au</language>
    <lastBuildDate>{rfc822(now)}</lastBuildDate>{''.join(items)}
  </channel>
</rss>
"""


def main():
    posts = fetch_posts()
    xml = build_feed(posts)
    with open(FEED_PATH, "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"Wrote {len(posts)} post(s) to {FEED_PATH}")


if __name__ == "__main__":
    main()
