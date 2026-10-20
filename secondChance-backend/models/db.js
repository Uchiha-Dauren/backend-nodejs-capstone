require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let dbInstance;
let connectionPromise;
let indexesPromise;

async function connectToDatabase() {
  if (dbInstance) return dbInstance;
  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017', {
        serverSelectionTimeoutMS: 10000,
      });
      try {
        await client.connect();
        dbInstance = client.db(process.env.MONGO_DB || 'secondChance');
        return dbInstance;
      } catch (error) {
        await client.close();
        connectionPromise = null;
        throw error;
      }
    })();
  }
  return connectionPromise;
}

async function ensureIndexes() {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const db = await connectToDatabase();
      await Promise.all([
        db.collection('secondChanceItems').createIndex({ id: 1 }, { unique: true }),
        db.collection('users').createIndex({ email: 1 }, { unique: true }),
      ]);
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  return indexesPromise;
}

async function close() {
  if (client) await client.close();
  client = null;
  dbInstance = null;
  connectionPromise = null;
  indexesPromise = null;
}

module.exports = connectToDatabase;
module.exports.ensureIndexes = ensureIndexes;
module.exports.close = close;
