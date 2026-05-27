const mongoose = require('mongoose');

// Connects to MongoDB using MONGO_URI from the environment.
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in the environment (check backend/.env)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  const { name, host } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
}

module.exports = { connectDB };
