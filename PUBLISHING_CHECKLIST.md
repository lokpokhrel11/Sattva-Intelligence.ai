# Publishing a new episode

Use this checklist for each new Bhāgavata Purāṇa companion page. Keep the episode's claims, Sanskrit readings, and verse references under separate scholarly review; the automated checks only validate website structure.

## Before publishing

- [ ] Create `episode-NN.html` using the established companion-page structure.
- [ ] Verify the episode title, canto/chapter coverage, and exact YouTube link and timestamps.
- [ ] Review Sanskrit IAST, Devanāgarī, translation attribution, verse numbering, and source notes.
- [ ] Update `episodes.html` (chronological table and canto browsing). Add the **video publication date** only after it is verified from YouTube Studio.
- [ ] Update `verse-index.html`, `concept-index.html`, `sanskrit-terms.html`, and `sanskrit-grammar.html` where relevant. Do not add unsupported entries merely for completeness.
- [ ] Add the new companion page URL to `sitemap.xml`; use the current `https://lokpokhrel11.github.io/Sattva-Intelligence.ai/` base.
- [ ] Check the canonical URL, navigation, mobile layout, and citation block. Distinguish the YouTube video's publication date from the webpage's own publication/update date.
- [ ] Check all internal links, fragment anchors, media embeds, and citations.

## After publishing

- [ ] In GitHub Actions, confirm that **Build search index** finishes successfully, including its separate **audit** job.
- [ ] Confirm `search-index.json` contains the new `episode-NN.html` entry. The search index is generated from sitemap-listed pages; do not edit it by hand unless recovering from a failed build.
- [ ] Test the live `search.html` page with the new episode title, a key concept, a Sanskrit term, and a verse reference.
- [ ] Verify the new episode URL and related index links in a mobile browser.
- [ ] If GitHub Actions reports a failed link audit, fix the broken target/anchor or sitemap omission before considering the release complete.
- [ ] Request indexing in Google Search Console if appropriate; sitemap inclusion alone does not guarantee Google indexing.

## Local checks

Run from the repository root:

```sh
python3 scripts/audit_site.py
python3 scripts/build_search_index.py
```

The audit checks local targets, fragment anchors, and sitemap coverage. It does **not** verify external links, YouTube availability, scholarly accuracy, or rendering across devices.
