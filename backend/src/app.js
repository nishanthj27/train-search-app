// backend/src/app.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const trainRoutes = require('./routes/trainRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS - allow multiple origins for local + production frontend
const allowedOrigins = [
  'http://localhost:3000', // Local development React app
  process.env.FRONTEND_ORIGIN // Production frontend (set in Render later)
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like curl or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/trains', trainRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Train Search API is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/traindb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
