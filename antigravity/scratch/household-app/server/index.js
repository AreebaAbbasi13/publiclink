require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const billsRoutes = require('./routes/bills');
const expensesRoutes = require('./routes/expenses');
const pantryRoutes = require('./routes/pantry');
const budgetRoutes = require('./routes/budget');
const aiRoutes = require('./routes/ai');
const summaryRoutes = require('./routes/summary');
const notificationsRoutes = require('./routes/notifications');

const { startEmailScheduler } = require('./services/emailScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow any origin so the app works from all devices
const corsOptions = {
  origin: true, // reflect request origin (works from any device/phone/PC)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));

// Cache-Control: prevent stale API responses on all browsers and devices
// This is the root cause of Fix #2 (UI not updating without manual refresh)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// Serve frontend build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    // Don't cache index.html so the SPA always gets the latest shell
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));

app.use((req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('HomeSphere API is running.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HomeSphere Server listening on http://0.0.0.0:${PORT}`);
  // Start background email reminder scheduler
  startEmailScheduler();
});
