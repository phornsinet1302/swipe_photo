require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./src/config/db');
const sessionsRouter = require('./src/routes/sessions');
const photosRouter = require('./src/routes/photos');
const analyticsRouter = require('./src/routes/analytics');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/sessions', sessionsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/analytics', analyticsRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PhotoSwipe backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
