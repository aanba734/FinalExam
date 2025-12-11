const express = require('express');
const db = require('mysql2');
const app = express();

app.set('view engine', 'hjs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const configs = require('./config');
const connection = db.createConnection(configs.db);

connection.connect((err) => {
  if (err) {
    console.log("Error connecting to database: ", err);
    process.exit();
  } else {
    console.log("Connected to database");
  }
});

// homepage – HTMX vs full-page (same trick as lab)
app.get('/', (req, res) => {
  if (req.get("HX-Request")) {
    // small snippet for HTMX partial load
    res.send(
      '<div class="text-center">' +
      '<i class="bi bi-graph-up-arrow" style="font-size: 30vh;"></i>' +
      '<p class="lead">Income Share of the Top 1% explorer</p>' +
      '</div>'
    );
  } else {
    // full layout
    res.render('layout', {
      title: 'Income Share of the Top 1% Explorer',
      partials: {
        navbar: 'navbar',
      },
    });
  }
});

// mount your income router (we’ll create it soon)
const income = require('./routes/income');
income.connection = connection;   // dependency injection like lab
app.use('/income', income);

// wildcard route for reload issue (exactly like lab manual)
app.get(/.*/, (req, res, next) => {
  if (req.get("HX-Request")) {
    next();
  } else {
    res.render('layout', {
      title: 'Income Share of the Top 1% Explorer',
      partials: {
        navbar: 'navbar',
      },
      where: req.url,        // tells HTMX what to load into #main
    });
  }
});

app.listen(80, function () {
  console.log('Web server listening on port 80!');
});
