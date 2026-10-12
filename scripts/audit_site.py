#!/usr/bin/env python3
"""Audit internal HTML links and sitemap references in the published site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "/Sattva-Intelligence.ai/"
class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        for attr in ("href", "src"):
            if a.get(attr):
                self.refs.append((tag, attr, a[attr]))

def audit():
    pages = sorted(ROOT.glob("*.html"))
    parsed = {}
    for page in pages:
        p = Links()
        p.feed(page.read_text(encoding="utf-8"))
        parsed[page.name] = p
    errors = []
    checked = 0
    for name, page in parsed.items():
        for tag, attr, ref in page.refs:
            u = urlparse(ref)
            if u.scheme in ("mailto", "tel", "data", "javascript") or ref.startswith("//"):
                continue
            if u.scheme and u.scheme not in ("https", "http"):
                continue
            if u.netloc and u.netloc != "lokpokhrel11.github.io":
                continue
            path = unquote(u.path)
            if path.startswith(BASE):
                path = path[len(BASE):]
            elif path.startswith("/"):
                errors.append(f"{name}: site-root URL outside project: {ref}")
                continue
            if not path:
                target = ROOT / (name if not u.path and u.fragment else "index.html")
            else:
                target = (ROOT / path)
                if path.endswith("/"):
                    target = target / "index.html"
            checked += 1
            if not target.is_file():
                errors.append(f"{name}: missing target {ref}")
            elif u.fragment and target.suffix == ".html" and target.name in parsed and u.fragment not in parsed[target.name].ids:
                errors.append(f"{name}: missing anchor {ref}")
    tree = ET.parse(ROOT / "sitemap.xml")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    listed = set()
    for node in tree.findall(".//s:loc", ns):
        u = urlparse((node.text or "").strip())
        if u.netloc != "lokpokhrel11.github.io" or not u.path.startswith(BASE):
            errors.append(f"sitemap: unexpected URL {node.text}")
            continue
        path = unquote(u.path[len(BASE):]) or "index.html"
        listed.add(path)
        if not (ROOT / path).is_file():
            errors.append(f"sitemap: missing target {path}")
    for name in parsed:
        if name not in listed:
            errors.append(f"sitemap: HTML page omitted: {name}")
    print(f"Audited {len(parsed)} HTML pages, {checked} local links/assets, {len(listed)} sitemap entries.")
    if errors:
        print("\n".join(errors))
        return 1
    print("No broken local targets, anchors, or sitemap omissions detected.")
    return 0

if __name__ == "__main__":
    sys.exit(audit())
