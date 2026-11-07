import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:8765/';
const results = [];
await mkdir('qa-artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
let failures = 0;
function check(label, condition, detail = '') {
  const pass = Boolean(condition);
  results.push({ label, pass, detail });
  if (!pass) failures++;
  console.log((pass ? 'PASS ' : 'FAIL ') + label + (detail ? ': ' + detail : ''));
}
try {
  for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'allow' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `qa-artifacts/home-${width}.png`, fullPage: true });
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    check(`No horizontal overflow at ${width}px`, dimensions.scrollWidth <= dimensions.viewportWidth + 1, JSON.stringify(dimensions));
    const menu = page.locator('.menu-button');
    if (width <= 1100) {
      check(`Mobile menu visible at ${width}px`, await menu.isVisible());
      await menu.click();
      check(`Menu opens at ${width}px`, await menu.getAttribute('aria-expanded') === 'true');
      await page.keyboard.press('Escape');
      check(`Escape closes menu at ${width}px`, await menu.getAttribute('aria-expanded') === 'false');
      check(`Escape restores focus at ${width}px`, await menu.evaluate(el => document.activeElement === el));
      await menu.click();
      await page.evaluate(() => document.querySelector('footer')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      check(`Outside click closes menu at ${width}px`, await menu.getAttribute('aria-expanded') === 'false');
    }
    if (width === 375) {
      const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
      check('Homepage has PWA manifest link', manifest === 'manifest.webmanifest', String(manifest));
      const response = await page.request.get(base + 'manifest.webmanifest');
      check('Manifest endpoint responds', response.ok(), String(response.status()));
      const worker = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return 'unsupported';
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state || 'inactive';
      });
      check('Service worker active on local preview', worker === 'activated', worker);
    }
    await context.close();
  }
  const page = await browser.newPage();
  for (const path of ['research.html', 'method.html', 'episodes.html', 'search.html']) {
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    check(`${path} responds`, response?.ok(), String(response?.status()));
    check(`${path} manifest link`, await page.locator('link[rel="manifest"]').count() > 0);
  }
  await page.goto(base + 'search.html', { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[type="search"]').first();
  if (await searchInput.count()) {
    await searchInput.fill('Vidura');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForFunction(() => /matching pages? found across/.test(document.querySelector('#search-status')?.textContent || ''), { timeout: 10000 }).catch(() => {});
    const statusText = await page.locator('#search-status').innerText();
    const resultCount = await page.locator('.search-result').count();
    check('Archive search returns matches', resultCount > 0, `results=${resultCount}; status=${statusText}`);
  } else {
    check('Archive search input found', false);
  }
  // Scholarly discovery and publication metadata checks.
  const sitemapResponse = await page.request.get(base + 'sitemap.xml');
  check('Sitemap responds', sitemapResponse.ok(), String(sitemapResponse.status()));
  const sitemapXml = await sitemapResponse.text();
  const sitemapUrls = [...sitemapXml.matchAll(new RegExp('<loc>([^<]+)</loc>', 'g'))].map(match => match[1]);
  check('Sitemap lists at least 29 pages', sitemapUrls.length >= 29, String(sitemapUrls.length));
  check('Episode 13 research page is in sitemap', sitemapUrls.some(url => url.endsWith('/episode-13-research.html')));
  const origin = 'https://lokpokhrel11.github.io/Sattva-Intelligence.ai/';
  for (const url of sitemapUrls) {
    const path = url === origin ? 'index.html' : url.startsWith(origin) ? url.slice(origin.length) : null;
    if (!path) { check('Sitemap URL belongs to website', false, url); continue; }
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null);
    check('Sitemap page and canonical: ' + path, Boolean(response?.ok()) && canonical === url, String(response?.status()) + '; ' + canonical);
  }
  const robots = await page.request.get(base + 'robots.txt');
  check('Robots file advertises sitemap', robots.ok() && (await robots.text()).includes(origin + 'sitemap.xml'));
  const manifestResponse = await page.request.get(base + 'manifest.webmanifest');
  const manifestData = await manifestResponse.json();
  for (const entry of manifestData.icons || []) {
    const asset = await page.request.get(base + entry.src);
    check('PWA icon exists: ' + entry.src, asset.ok(), String(asset.status()));
  }
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  check('Homepage has valid WebSite structured data', jsonLd.some(raw => { try { const data = JSON.parse(raw); return data['@type'] === 'WebSite' && data.url === origin; } catch { return false; } }));
  await page.close();
} finally {
  await browser.close();
  await writeFile('qa-artifacts/results.json', JSON.stringify(results, null, 2));
}
if (failures) process.exitCode = 1;
