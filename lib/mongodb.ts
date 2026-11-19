import 'server-only';

import { MongoClient } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MongoDB_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MongoDB connection URI is not configured. Please set MongoDB_URI or MONGODB_URI in your environment variables.',
    );
  }

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri);
    globalForMongo.mongoClientPromise = client.connect();
  }

  return globalForMongo.mongoClientPromise;
}
