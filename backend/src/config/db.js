import mongoose from "mongoose";
import { env } from "./env.js";

let connecting;

export function connectDb() {
  if (!env.mongoUri) throw new Error("MONGODB_URI is not set");
  // maxPoolSize 1 keeps serverless isolates from exhausting Atlas M0's connection limit.
  // dbName pins our own database; a URI without a path would otherwise land in the shared default "test" db.
  connecting ??= mongoose.connect(env.mongoUri, { dbName: "kelados", maxPoolSize: 1, serverSelectionTimeoutMS: 8000 })
    .catch((e) => { connecting = undefined; throw e; });
  return connecting;
}
