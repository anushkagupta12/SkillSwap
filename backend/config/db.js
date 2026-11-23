const mongoose = require('mongoose');

/**
 * Connects to MongoDB. Throws on failure so the caller (server.js) decides
 * what to do - we never call process.exit from library code.
 */
const connectDB = async (uri = process.env.MONGO_URI) => {
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
