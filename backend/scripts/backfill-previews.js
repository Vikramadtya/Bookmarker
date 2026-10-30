#!/usr/bin/env node
/**
 * Fills `imageURL` (the og:image preview shown on cards) for bookmarks saved
 * before previews existed. Safe to re-run: it only touches bookmarks without one.
 *
 *   npm run build && MONGODB_URI=... node scripts/backfill-previews.js [--limit 500]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const cheerio = require('cheerio');
const { safeRequest } = require('../dist/core/security/url-safety');
const { mapLimit } = require('../dist/core/common/async');

const CONCURRENCY = 4;
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 1000;

function previewImage(html, baseUrl) {
  const $ = cheerio.load(html);
  const href =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[property="twitter:image"]').attr('content');
  if (!href) return '';
  try {
    const url = new URL(href, baseUrl);
    return /^https?:$/.test(url.protocol) ? url.toString().slice(0, 2048) : '';
  } catch {
    return '';
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookmarker';
  await mongoose.connect(uri);
  const bookmarks = mongoose.connection.collection('bookmarks');

  const pending = await bookmarks
    .find({
      scrapeStatus: { $ne: 'pending' },
      $or: [{ imageURL: { $exists: false } }, { imageURL: '' }],
    })
    .project({ bookmarkURL: 1 })
    .limit(LIMIT)
    .toArray();
  console.log(`Checking ${pending.length} bookmarks...`);

  let filled = 0;
  await mapLimit(pending, CONCURRENCY, async (b) => {
    let imageURL = '';
    try {
      const res = await safeRequest(b.bookmarkURL, {
        timeoutMs: 8000,
        maxBytes: 2_000_000,
      });
      if (res.status < 400) imageURL = previewImage(res.body, res.url);
    } catch (err) {
      if (process.env.DEBUG) console.error(b.bookmarkURL, err.message);
      // unreachable pages simply stay without a preview
    }
    if (imageURL) {
      await bookmarks.updateOne({ _id: b._id }, { $set: { imageURL } });
      filled++;
    }
  });
  console.log(`Added previews to ${filled} of ${pending.length}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
