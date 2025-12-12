const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 80;  // Changed to 80 to match compose.yaml

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
let pool;

// Initialize database connection
async function initDatabase() {
  try {
    pool = mysql.createPool(config.db);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⏳ Retrying in 5 seconds...');
    
    // Retry connection after 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    return initDatabase();
  }
}

// Make pool available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/api'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server after database connection is ready
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:8080`);
    console.log(`📊 Income Share Top 1% Analysis Platform`);
  });
});