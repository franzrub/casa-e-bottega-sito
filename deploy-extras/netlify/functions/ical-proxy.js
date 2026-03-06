/*
  ical-proxy.js — Netlify Function
  Casa e Bottega · Manfredonia

  Fetches iCal feeds from Airbnb and Booking.com server-side,
  PLUS manual blocked dates from Google Sheets CSV.

  Called by: /.netlify/functions/ical-proxy
  Returns:   { dimora: ["2026-07-10", ...], bottega: ["2026-07-12", ...] }

  ─── Per bloccare/sbloccare date manualmente ───────────────────────
  Apri il Google Sheet e aggiungi/rimuovi righe:
    colonna A → camera  (scrivi: dimora  oppure  bottega)
    colonna B → data    (scrivi: YYYY-MM-DD, es: 2026-07-15)
  Il calendario si aggiorna entro 15 minuti, senza toccare codice.
  ──────────────────────────────────────────────────────────────────
*/

const https = require('https');
const http  = require('http');

// ─── iCal feed URLs ──────────────────────────────────────────────
const FEEDS = {
  dimora: [
    'https://www.airbnb.it/calendar/ical/1138415603108313561.ics?t=948d119c86634a1ca2246dc4705089ab',
    'https://ical.booking.com/v1/export?t=12e665bb-ba43-4b72-93d9-ea4c791e9824'
  ],
  bottega: [
    'https://www.airbnb.it/calendar/ical/1116637938226303262.ics?t=7bb16c4c0c7142b2bbf43ea12cafd400',
    'https://ical.booking.com/v1/export?t=b9b2884e-11f8-4164-984e-584c2e8e20b8'
  ]
};

// ─── Google Sheets CSV (date bloccate manualmente) ───────────────
//  Foglio: https://docs.google.com/spreadsheets/d/e/2PACX-...
//  Colonna A: camera (dimora / bottega)
//  Colonna B: data   (YYYY-MM-DD)
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5peWS5zt3LrMRTmENWIzj83ZnDZFk0Pv4wadHXOwF1sAXxavqe8hB__zlZKQfbN23nx23FjtryJeh/pub?gid=0&single=true&output=csv';

// ─── Fetch a URL → string ─────────────────────────────────────────
function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CasaEBottega/1.0)' },
      timeout: 8000
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchUrl(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Parse ICS → booked dates ─────────────────────────────────────
function parseICS(icsText) {
  const dates = [];
  for (const event of icsText.split('BEGIN:VEVENT')) {
    const startMatch = event.match(/DTSTART(?:;[^:]*)?:(\d{8})/);
    const endMatch   = event.match(/DTEND(?:;[^:]*)?:(\d{8})/);
    if (!startMatch || !endMatch) continue;
    const toDate = s => new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8));
    const start = toDate(startMatch[1]);
    const end   = toDate(endMatch[1]);
    for (let d = new Date(start); d < end; d.setDate(d.getDate()+1)) {
      dates.push(d.toISOString().slice(0,10));
    }
  }
  return dates;
}

// ─── Parse Google Sheets CSV → { dimora: [...], bottega: [...] } ──
function parseSheetCSV(csvText) {
  const result = { dimora: [], bottega: [] };
  const lines = csvText.trim().split('\n');

  // Skip header row (first line)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '').toLowerCase());
    const camera = cols[0]; // "dimora" or "bottega"
    const data   = cols[1]; // "YYYY-MM-DD"

    if (!camera || !data) continue;
    if (!data.match(/^\d{4}-\d{2}-\d{2}$/)) continue; // skip malformed dates

    if (camera === 'dimora' && result.dimora !== undefined) {
      result.dimora.push(data);
    } else if (camera === 'bottega' && result.bottega !== undefined) {
      result.bottega.push(data);
    }
  }
  return result;
}

// ─── Handler ──────────────────────────────────────────────────────
exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=900' // 15 min CDN cache
  };

  try {
    const result = { dimora: new Set(), bottega: new Set() };

    // 1. Fetch iCal feeds (Airbnb + Booking)
    for (const room of ['dimora', 'bottega']) {
      for (const url of FEEDS[room]) {
        try {
          const icsText = await fetchUrl(url);
          parseICS(icsText).forEach(d => result[room].add(d));
          console.log(`[ical] ${room}/${url.includes('airbnb') ? 'airbnb' : 'booking'}: ok`);
        } catch (err) {
          console.warn(`[ical] ${room} feed failed: ${err.message}`);
        }
      }
    }

    // 2. Fetch manual dates from Google Sheets
    try {
      const csvText = await fetchUrl(SHEETS_CSV_URL);
      const manual  = parseSheetCSV(csvText);
      manual.dimora.forEach(d  => result.dimora.add(d));
      manual.bottega.forEach(d => result.bottega.add(d));
      console.log(`[sheets] dimora:${manual.dimora.length} bottega:${manual.bottega.length} manual dates loaded`);
    } catch (err) {
      console.warn(`[sheets] Google Sheets fetch failed: ${err.message}`);
      // Non-fatal: iCal dates still work
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dimora:  [...result.dimora].sort(),
        bottega: [...result.bottega].sort()
      })
    };

  } catch (err) {
    console.error('[ical-proxy] Fatal:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, dimora: [], bottega: [] })
    };
  }
};
