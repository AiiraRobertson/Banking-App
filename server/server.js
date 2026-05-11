require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

const PORT = process.env.PORT || 3001;
const CLUSTER = process.env.CLUSTER === '1';
const WORKER_COUNT = Number(process.env.WORKERS) || os.cpus().length;

if (CLUSTER && cluster.isPrimary) {
  // Initialise + seed the DB once, in the primary, before any worker boots.
  // SQLite uses WAL so workers can each open their own handle safely afterwards.
  const { initializeDatabase } = require('./db/schema');
  const { seedDatabase } = require('./db/seed');
  initializeDatabase();
  seedDatabase();

  console.log(`Primary ${process.pid} forking ${WORKER_COUNT} worker(s) on port ${PORT}`);
  for (let i = 0; i < WORKER_COUNT; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited (${signal || code}) — replacing`);
    cluster.fork();
  });
} else {
  startServer();
}

function startServer() {
  const express = require('express');
  const path = require('path');
  const cors = require('cors');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const { initializeDatabase } = require('./db/schema');
  const { seedDatabase } = require('./db/seed');
  const { errorHandler } = require('./middleware/errorHandler');

  const app = express();

  // In single-process mode, run the migrations + seed inline.
  // In cluster mode, the primary already did it; workers just open the file.
  if (!CLUSTER) {
    initializeDatabase();
    seedDatabase();
  } else {
    initializeDatabase(); // idempotent — needed so each worker has the schema cached
  }

  // CORS must run before helmet, rate-limit, body-parser, and routes so that
  // browser preflight (OPTIONS) requests short-circuit immediately and never
  // touch auth, validation, or DB code.
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501'
  ];

  // Production frontend origins — set CLIENT_ORIGIN to your Netlify URL
  // (comma-separate multiple, e.g. "https://kapita.netlify.app,https://kapita.com").
  if (process.env.CLIENT_ORIGIN) {
    process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
      .forEach(o => allowedOrigins.push(o));
  }

  // Default Netlify deploy-preview / branch-deploy domains for the same site.
  if (process.env.NETLIFY_SITE_NAME) {
    const name = process.env.NETLIFY_SITE_NAME;
    allowedOrigins.push(new RegExp(`^https:\\/\\/(?:[\\w-]+--)?${name}\\.netlify\\.app$`));
  }

  // Legacy Azure support (kept so existing Azure deploys keep working).
  if (process.env.NODE_ENV === 'production') {
    allowedOrigins.push(/\.azurewebsites\.net$/);
  }

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24h — browsers cache preflight result, skipping OPTIONS on subsequent calls
    optionsSuccessStatus: 204
  };
  app.use(cors(corsOptions));
  // Explicitly answer every preflight at the edge so it never reaches helmet,
  // rate-limit, body parsing, auth, or route handlers.
  app.options(/.*/, cors(corsOptions));

  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));

  if (process.env.LOAD_TEST !== '1') {
    // NOTE: in cluster mode this counter is per-worker. Effective cap = max * WORKER_COUNT.
    // Move to a shared store (Redis) if you need exact global limits across workers.
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: { error: 'Too many requests, please try again later' },
      // Don't count OPTIONS preflights toward the limit — they're issued by the
      // browser, not the user, and would unfairly burn quota on bursty SPAs.
      skip: (req) => req.method === 'OPTIONS'
    });
    app.use(globalLimiter);
  }

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', pid: process.pid, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/accounts', require('./routes/accounts'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/billpay', require('./routes/billpay'));
  app.use('/api/funding', require('./routes/funding'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/profile', require('./routes/profile'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/currency', require('./routes/currency'));
  app.use('/api/wire', require('./routes/wire'));
  app.use('/api/resources', require('./routes/resources'));
  app.use('/api/beneficiaries', require('./routes/beneficiaries'));

  app.use(errorHandler);

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.listen(PORT, () => {
    const tag = CLUSTER ? `worker ${process.pid}` : 'server';
    console.log(`${tag} running on http://localhost:${PORT}`);
  });
}
