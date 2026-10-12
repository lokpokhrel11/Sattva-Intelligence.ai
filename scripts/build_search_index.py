#!/usr/bin/env python3
"""Build a static, same-origin search index from sitemap-listed HTML pages."""
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"script", "style", "nav", "footer"}

class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.title = []
        self.in_title = False
        self.in_main = False
        self.main_found = False
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.in_main = True
            self.main_found = True
        if tag in SKIP or (tag == "header" and dict(attrs).get("class", "") == "site-header"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "main":
            self.in_main = False
        if tag in SKIP or tag == "header" and self.skip:
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.in_main and not self.skip:
            self.parts.append(data)

def build():
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>\s*(.*?)\s*</loc>", sitemap)
    docs = []
    for absolute in urls:
        parsed = urlparse(html.unescape(absolute))
        filename = unquote(parsed.path.rsplit("/", 1)[-1])
        if not filename.endswith(".html") or filename == "search.html" or "/" in filename or filename.startswith("."):
            continue
        file = ROOT / filename
        if not file.is_file():
            raise SystemExit(f"Sitemap references missing file: {filename}")
        parser = Extract()
        parser.feed(file.read_text(encoding="utf-8"))
        if not parser.main_found:
            raise SystemExit(f"No main element: {filename}")
        title = " ".join("".join(parser.title).split())
        title = re.sub(r"\s*[—|]\s*Sattva Intelligence.*$", "", title)
        body = " ".join(" ".join(parser.parts).split())
        docs.append({"url": filename, "title": title, "text": body})
    output = ROOT / "search-index.json"
    output.write_text(json.dumps({"version": 1, "documents": docs}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Indexed {len(docs)} pages in {output.name} ({output.stat().st_size} bytes)")

if __name__ == "__main__":
    build()
