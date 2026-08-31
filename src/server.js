const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');

// Start listening immediately (Hostinger requires listen() within 3 seconds)
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`API docs: http://localhost:${config.port}/api-docs`);
});

// Connect to MongoDB in background
connectDB();
