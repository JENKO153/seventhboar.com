#!/usr/bin/env python3
"""Weekly snapshot of the site's PUBLISHED content: devlog entries, projects and the site settings
(homepage wording, pages, pricing, care plans). Run by .github/workflows/backup-content.yml.

Only what the public site can already read is saved, using the same public key as the website, so nothing
private (drafts, orders, subscribers, comments) ever lands in the repository. For a full backup, use
Admin -> Security & activity -> Download a backup.
"""
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = (ROOT / "assets" / "js" / "config.js").read_text()
SUPABASE_URL = re.search(r"supabaseUrl:\s*'([^']+)'", CFG).group(1)
KEY = re.search(r"supabaseKey:\s*'([^']+)'", CFG).group(1)


def fetch(table, order):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?select=*&order={order}&limit=1000",
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    snapshot = {
        "note": "Published content only. Photos are not included. Full backups: Admin -> Security & activity.",
        "posts": fetch("journal_posts", "published_at.desc"),
        "projects": fetch("projects", "published_at.desc"),
        "site_settings": fetch("site_settings", "id.asc"),
    }
    out = ROOT / "backups" / "public-content.json"
    out.parent.mkdir(exist_ok=True)
    # No timestamp inside, so the file (and the repository) only changes when the content does.
    out.write_text(json.dumps(snapshot, indent=2, sort_keys=True, ensure_ascii=False) + "\n")
    print(f"backups/public-content.json written ({len(snapshot['posts'])} entries, {len(snapshot['projects'])} projects)")


if __name__ == "__main__":
    main()
