import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const cached: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } = {};

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI!);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
