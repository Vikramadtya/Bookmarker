/**
 * One-off data migration for the performance/security release. Safe to re-run.
 *
 *   MONGODB_URI=mongodb://... node scripts/migrate-slugs.js
 *
 * - gives every folder a unique per-user slug (the new unique index needs them)
 * - flags each user's Inbox with isInbox and removes duplicate Inboxes
 * - replaces the old "Scraping..." placeholder text with scrapeStatus
 * - drops the obsolete full-text index (search no longer uses it)
 */
const mongoose = require('mongoose');

const slugify = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'folder';

async function run() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/bookmarker';
  await mongoose.connect(uri);
  const db = mongoose.connection;
  const folders = db.collection('folders');
  const bookmarks = db.collection('bookmarks');

  // 1. Unique slugs per user (first folder keeps its slug, later duplicates get -1, -2, ...)
  const used = new Map(); // userId -> Set(slug)
  let reslugged = 0;
  for await (const folder of folders.find({}).sort({ createdAt: 1 })) {
    const taken = used.get(folder.userId) ?? new Set();
    used.set(folder.userId, taken);
    let slug = folder.slug || slugify(folder.name);
    if (taken.has(slug)) {
      const base = slugify(folder.name);
      let n = 1;
      slug = base;
      while (taken.has(slug)) slug = `${base}-${n++}`;
    }
    taken.add(slug);
    if (slug !== folder.slug) {
      await folders.updateOne({ _id: folder._id }, { $set: { slug } });
      reslugged++;
    }
  }

  // 2. Inbox flag; merge duplicate Inboxes into the oldest one
  const inboxes = await folders
    .find({ name: 'Inbox', parentId: null })
    .sort({ createdAt: 1 })
    .toArray();
  const keeperByUser = new Map();
  let mergedInboxes = 0;
  for (const inbox of inboxes) {
    const keeper = keeperByUser.get(inbox.userId);
    if (!keeper) {
      keeperByUser.set(inbox.userId, inbox);
      await folders.updateOne({ _id: inbox._id }, { $set: { isInbox: true } });
    } else {
      await bookmarks.updateMany(
        { userId: inbox.userId, folderId: inbox._id },
        { $set: { folderId: keeper._id } },
      );
      await folders.deleteOne({ _id: inbox._id });
      mergedInboxes++;
    }
  }

  // 3. Placeholder titles -> scrapeStatus
  const pendingTitle = await bookmarks.updateMany(
    { title: 'Scraping...' },
    { $set: { title: '', scrapeStatus: 'failed' } },
  );
  await bookmarks.updateMany(
    { description: 'Extracting metadata...' },
    { $set: { description: '' } },
  );
  await bookmarks.updateMany(
    { scrapeStatus: { $exists: false } },
    { $set: { scrapeStatus: 'done' } },
  );

  // 4. Bookmarks without a folder go to the owner's Inbox (the API now requires one)
  let rehomed = 0;
  for (const [userId, inbox] of keeperByUser) {
    const res = await bookmarks.updateMany(
      { userId, $or: [{ folderId: null }, { folderId: 'root' }] },
      { $set: { folderId: inbox._id } },
    );
    rehomed += res.modifiedCount;
  }

  // 5. Obsolete full-text index
  const dropped = [];
  for (const index of await bookmarks.indexes()) {
    if (index.textIndexVersion) {
      await bookmarks.dropIndex(index.name);
      dropped.push(index.name);
    }
  }

  console.log({
    reslugged,
    mergedInboxes,
    placeholdersFixed: pendingTitle.modifiedCount,
    rehomed,
    droppedIndexes: dropped,
  });
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
