const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  const maxRetries = 5;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${i}/${maxRetries} failed:`, error.message);
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  console.error('MongoDB connection failed after all retries');
};

module.exports = connectDB;
