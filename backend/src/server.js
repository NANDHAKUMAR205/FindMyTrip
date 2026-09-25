// 1. Force Node.js to use Google's DNS to resolve the SRV record
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { port, mongoUri, clientUrl } = require('./config/env');
const routes = require('./routes');
const errors = require('./middleware/errors');

const app = express();

const allowedOrigins = clientUrl.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ success: true, service: 'FindMyTrip API' }));

app.use('/api', routes);
app.use(errors);

// 2. Connect using the patched DNS settings
mongoose.connect(mongoUri)
  .then(() => app.listen(port, () => console.log(`FindMyTrip API listening on ${port}`)))
  .catch((error) => { 
    console.error('MongoDB connection failed', error); 
    process.exit(1); 
  });
