const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectToDatabase = require('../../models/db');
const { docs: data } = require('./secondChanceItems.json');

async function loadData() {
  const db = await connectToDatabase();
  await connectToDatabase.ensureIndexes();
  const collection = db.collection('secondChanceItems');
  // Repeated setup preserves existing edits instead of overwriting them.
  const result = await collection.bulkWrite(
    data.map((item) => ({
      updateOne: { filter: { id: item.id }, update: { $setOnInsert: item }, upsert: true },
    })),
  );
  const totalCount = await collection.countDocuments();
  console.log(`Inserted documents: ${result.upsertedCount}`);
  console.log(`Total documents in ${db.databaseName}.secondChanceItems: ${totalCount}`);
  return { insertedCount: result.upsertedCount, totalCount };
}

if (require.main === module) {
  loadData()
    .catch((error) => {
      console.error(`Import failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => connectToDatabase.close());
}

module.exports = { loadData };
