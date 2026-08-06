const mongoose = require('mongoose');

// Utility to generate unique slug
async function generateUniqueSlug(db, userId, name) {
  const baseSlug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'folder';
  let slug = baseSlug;
  let counter = 1;
  while (await db.collection('folders').findOne({ userId, slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookmarker';
  console.log(`Connecting to MongoDB at ${uri}...`);

  await mongoose.connect(uri);
  const db = mongoose.connection;

  console.log('Finding folders without slugs...');
  const folders = await db
    .collection('folders')
    .find({ slug: { $exists: false } })
    .toArray();

  console.log(`Found ${folders.length} folders to migrate.`);

  let migrated = 0;
  for (const folder of folders) {
    const slug = await generateUniqueSlug(db, folder.userId, folder.name);
    await db
      .collection('folders')
      .updateOne({ _id: folder._id }, { $set: { slug } });
    console.log(`- Migrated: ${folder.name} -> ${slug}`);
    migrated++;
  }

  console.log(`Migration complete. ${migrated} folders updated.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
