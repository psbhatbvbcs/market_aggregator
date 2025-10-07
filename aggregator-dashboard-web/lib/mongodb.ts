import mongoose from "mongoose";

// Extend the global type to include mongoose
declare global {
  var mongoose: {
    conn: any | null;
    promise: Promise<any> | null;
  } | undefined;
}

const MONGODB_URI = process.env.MONGO_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGO_URI environment variable inside .env or .env.local"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Ensure cached is not undefined - this should never happen after the above assignment
if (!cached) {
  throw new Error("Failed to initialize mongoose cache");
}

// TypeScript assertion to ensure cached is defined
const cachedConnection = cached!;

export async function connectToDatabase() {
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    const opts = {
      bufferCommands: false,
    };

    cachedConnection.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseConnection) => {
      return mongooseConnection;
    });
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (e) {
    cachedConnection.promise = null;
    throw e;
  }

  return cachedConnection.conn;
} 