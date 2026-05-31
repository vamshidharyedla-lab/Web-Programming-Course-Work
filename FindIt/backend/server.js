require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findit';

// Allow JSON requests and cross-origin requests from the frontend
app.use(cors());
app.use(express.json());

// Mount the route files
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Simple health check route to confirm the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB, then start the server
mongoose.connect(DB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
