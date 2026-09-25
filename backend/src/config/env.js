const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  liteApiKey: process.env.LITEAPI_API_KEY || process.env.LITEAPI_KEY,
  clientUrl: process.env.CLIENT_URL || 'https://frontend-teal-theta-56.vercel.app',
};
