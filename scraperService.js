// scraperService.js — Corrected cheerio import for ES Modules
import axios from 'axios';
import * as cheerio from 'cheerio';
import xml2js from 'xml2js';
import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.resolve(process.cwd(), 'candidates.json');
const PAGES = 20;
const XML_PARSER = new xml2js.Parser({ explicitArray: false });

// Scrape browse pages for IDs & images
async function scrapeBrowsePage(page) {
  const url = `https://boardgamegeek.com/browse/boardgame/page/${page}`;
  const html = (await axios.get(url)).data;
  const $ = cheerio.load(html);
  return $('.collection_table .collection_thumbnail').map((i, el) => {
    const href = $(el).parent().attr('href');
    const id = href.split('/')[2];
    const image = $(el).find('img').attr('src');
    return { id, image };
  }).get();
}

// Fetch BGG XML details for one game ID
async function fetchDetails(id) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  const xml = (await axios.get(url)).data;
  const parsed = await XML_PARSER.parseStringPromise(xml);
  const item = parsed.items.item;
  const name = Array.isArray(item.name)
    ? item.name.find(n => n.$.type === 'primary').$.value
    : item.name.$.value;
  const links = Array.isArray(item.link) ? item.link : [item.link];
  const mechanics = links.filter(l => l.$.type === 'boardgamemechanic').map(l => l.$.value);
  const categories = links.filter(l => l.$.type === 'boardgamecategory').map(l => l.$.value);
  const weight = parseFloat(item.statistics.ratings.averageweight._) || 0;
  return { name, mechanics, categories, weight };
}

// Main: scrape + enrich + cache
export async function buildCandidates() {
  const browseEntries = [];
  for (let page = 1; page <= PAGES; page++) {
    const entries = await scrapeBrowsePage(page);
    browseEntries.push(...entries);
    await new Promise(r => setTimeout(r, 1000));
  }

  const candidates = [];
  for (const { id, image } of browseEntries) {
    try {
      const data = await fetchDetails(id);
      candidates.push({ ...data, image });
    } catch (e) {
      console.warn(`Failed to fetch ${id}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  await fs.writeFile(CACHE_FILE, JSON.stringify(candidates, null, 2));
  return candidates;
}

// Load from cache or rebuild if missing/outdated
export async function getCandidates() {
  try {
    const stat = await fs.stat(CACHE_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    if (ageMs < oneMonthMs) {
      const json = await fs.readFile(CACHE_FILE, 'utf-8');
      return JSON.parse(json);
    }
  } catch {}
  // cache missing or stale
  return await buildCandidates();
}

