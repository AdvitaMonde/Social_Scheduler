const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const config = require('./config');
const metaAuthRoutes = require('./routes/metaAuth');
const accountsRoutes = require('./routes/accounts');
const postsRoutes = require('./routes/posts');
const startPostScheduler = require('./jobs/postScheduler');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true
  })
);

// All Meta OAuth + connection-management endpoints.
app.get("/test", (req,res)=>{
    res.send("Backend works");
});
app.get("/", (req, res) => {
  res.send("AI Social Scheduler Backend Running");
});
app.use('/api/meta', metaAuthRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/posts', postsRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Catches errors passed via next(err) — including from asyncHandler-wrapped
// routes — so a failed request returns a clean 500 instead of hanging or
// crashing the process.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

async function start() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  startPostScheduler();

  app.listen(config.port, () => {
    console.log(`Server listening on ${config.baseUrl}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
