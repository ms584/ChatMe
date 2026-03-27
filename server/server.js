require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const setupSocket = require('./src/socket');

// ── Validate required environment variables before starting ──────────────────
const REQUIRED_ENV = [
  'MONGO_URI',
  'JWT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'ADMIN_GITHUB_USERNAME',
  'CLIENT_URL',
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('   Create a .env file in the server/ directory. See README for details.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// userId → socketId map (in-memory; sufficient for single instance)
const socketMap = new Map();

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  const ALLOWED_ORIGIN = process.env.CLIENT_URL ||
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:5173');

  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
    // Prevent large payload memory exhaustion (max message is 2000 chars, so 10kb is plenty)
    maxHttpBufferSize: 1e4,
  });

  // Make io and socketMap accessible from route handlers
  app.set('io', io);
  app.set('socketMap', socketMap);

  setupSocket(io, socketMap);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
