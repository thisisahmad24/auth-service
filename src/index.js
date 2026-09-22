require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must contain at least 32 characters.');
  process.exit(1);
}

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
