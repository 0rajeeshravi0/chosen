const mongoose = require('mongoose');
const config = require('./index');

/**
 * Connect to MongoDB, retrying indefinitely with capped exponential backoff.
 *
 * The server starts listening before this resolves (see server.js) because the
 * host requires a socket within a few seconds. That makes the retry policy
 * load-bearing: Mongoose only auto-reconnects after a *successful* initial
 * connection, so if the first attempt fails and we give up, every query
 * afterwards fails and the process serves 500s until someone restarts it.
 * Retrying forever means a bad connection string or a network blip recovers on
 * its own once the underlying problem is fixed.
 */
const connectDB = async () => {
  const baseDelayMs = 2000;
  const maxDelayMs = 60000;

  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.error(
        `MongoDB connection attempt ${attempt} failed: ${error.message}. ` +
          `Retrying in ${delay / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Surface connection state changes; a silent drop otherwise looks like a
// mysterious 500 with no explanation in the logs.
mongoose.connection.on('disconnected', () => console.error('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

module.exports = connectDB;
