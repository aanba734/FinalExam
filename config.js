const config = {
  db: {
    host: "172.17.0.2",   // container name = MySQL host from Node container
    user: "root",
    password: "Final",
    database: "Final",
    connectTimeout: 60000,
  },
};

module.exports = config;