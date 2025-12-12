const config = {
  db: {
    host: "db",              // Use service name from compose.yaml
    user: "root",            // Changed to root to match your password
    password: "rootpass",     // Match compose.yaml
    database: "Final",        // Match your database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
  },
};

module.exports = config;