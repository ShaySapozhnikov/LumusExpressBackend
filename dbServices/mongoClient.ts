import "dotenv/config";

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_CONNECTION_LINK;

if (!uri) {
  throw new Error("MONGODB_CONNECTION_LINK is not set");
}


export const mongoClient = new MongoClient(uri);

export const db = mongoClient.db("lumusExpress");

