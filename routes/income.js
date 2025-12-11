const express = require('express');
const app = express.Router();

// Helper function like lab manual: do SQL and handle errors centrally
function doSQL(SQL, parms, res, callback) {
  app.connection.execute(SQL, parms, function (err, data) {
    if (err) {
      console.log(err);
      res.status(404).send(err.sqlMessage);
    } else {
      callback(data);
    }
  });
}

/* =========================================================
 * Simple landing for /income
 * =======================================================*/
app.get('/', (req, res) => {
  res.send('<h2 class="text-center">Income Share Features</h2>');
});

/* =========================================================
 * 1) Country → time series (already discussed)
 * =======================================================*/

// GET /income/by-country : show dropdown UI
app.get('/by-country', (req, res) => {
  const SQL = "SELECT country_id, name FROM countries ORDER BY name";
  doSQL(SQL, [], res, (data) => {
    res.render('income/by-country', {
      countries: data,
    });
  });
});

// GET /income/by-country/list?country_id=...
// return table: year (DESC) + top1_share
app.get('/by-country/list', (req, res) => {
  const SQL = `
    SELECT y.year_value AS year, i.top1_share
    FROM income_shares i
    JOIN years y ON i.year_id = y.year_id
    WHERE i.country_id = ?
    ORDER BY y.year_value DESC
  `;
  doSQL(SQL, [req.query.country_id], res, (data) => {
    res.render('income/by-country-list', {
      records: data,
    });
  });
});


/* =========================================================
 * 2) Sub-region + year → countries + share (ASC)
 * =======================================================*/

// GET /income/by-subregion : show dropdown for sub-region + year
app.get('/by-subregion', (req, res) => {
  const SQL1 = `
    SELECT DISTINCT sub_region_name
    FROM regions
    WHERE sub_region_name IS NOT NULL
    ORDER BY sub_region_name
  `;
  const SQL2 = `
    SELECT year_id, year_value
    FROM years
    ORDER BY year_value
  `;

  doSQL(SQL1, [], res, (subregions) => {
    doSQL(SQL2, [], res, (years) => {
      res.render('income/by-subregion', {
        subregions,
        years,
      });
    });
  });
});

// GET /income/by-subregion/list?sub_region_name=...&year_value=...
app.get('/by-subregion/list', (req, res) => {
  const SQL = `
    SELECT c.name AS country, i.top1_share
    FROM income_shares i
    JOIN countries c ON i.country_id = c.country_id
    JOIN years y ON i.year_id = y.year_id
    JOIN regions r ON c.region_id = r.region_id
    WHERE r.sub_region_name = ?
      AND y.year_value = ?
    ORDER BY i.top1_share ASC, c.name ASC
  `;
  const params = [req.query.sub_region_name, req.query.year_value];
  doSQL(SQL, params, res, (data) => {
    res.render('income/by-subregion-list', {
      records: data,
    });
  });
});


/* =========================================================
 * 3) Region + year → sub-regions + average share
 * =======================================================*/

// GET /income/by-region : dropdown for region + year
app.get('/by-region', (req, res) => {
  const SQL1 = `
    SELECT DISTINCT region_name
    FROM regions
    WHERE region_name IS NOT NULL
    ORDER BY region_name
  `;
  const SQL2 = `
    SELECT year_id, year_value
    FROM years
    ORDER BY year_value
  `;
  doSQL(SQL1, [], res, (regions) => {
    doSQL(SQL2, [], res, (years) => {
      res.render('income/by-region', {
        regions,
        years,
      });
    });
  });
});

// GET /income/by-region/list?region_name=...&year_value=...
app.get('/by-region/list', (req, res) => {
  const SQL = `
    SELECT
      r.region_name,
      r.sub_region_name,
      AVG(i.top1_share) AS avg_share
    FROM income_shares i
    JOIN countries c ON i.country_id = c.country_id
    JOIN years y ON i.year_id = y.year_id
    JOIN regions r ON c.region_id = r.region_id
    WHERE r.region_name = ?
      AND y.year_value = ?
    GROUP BY r.region_name, r.sub_region_name
    ORDER BY r.region_name, avg_share
  `;
  const params = [req.query.region_name, req.query.year_value];
  doSQL(SQL, params, res, (data) => {
    res.render('income/by-region-list', {
      records: data,
    });
  });
});


/* =========================================================
 * 4) Keyword search on country names (partial) → latest year
 * =======================================================*/

// GET /income/search : show search input
app.get('/search', (req, res) => {
  res.render('income/search');
});

// GET /income/search/results?keyword=...
app.get('/search/results', (req, res) => {
  const keyword = req.query.keyword || '';
  const SQL = `
    SELECT c.name, i.top1_share, y.year_value
    FROM countries c
    JOIN income_shares i ON c.country_id = i.country_id
    JOIN years y ON i.year_id = y.year_id
    WHERE y.year_value = (SELECT MAX(year_value) FROM years)
      AND c.name LIKE CONCAT('%', ?, '%')
    ORDER BY c.name
  `;
  doSQL(SQL, [keyword], res, (data) => {
    res.render('income/search-results', {
      records: data,
      keyword,
    });
  });
});


/* =========================================================
 * 5) Add new Income Share for NEXT year of a country
 * =======================================================*/

// GET /income/add-next : show form
app.get('/add-next', (req, res) => {
  const SQL = "SELECT country_id, name FROM countries ORDER BY name";
  doSQL(SQL, [], res, (countries) => {
    res.render('income/add-next', {
      countries,
    });
  });
});

// POST /income/add-next : do the insertion
app.post('/add-next', (req, res) => {
  const country_id = req.body.country_id;
  const new_share = req.body.top1_share;

  // 1) Find latest year for this country
  const SQL_latest = `
    SELECT MAX(y.year_value) AS latest_year
    FROM income_shares i
    JOIN years y ON i.year_id = y.year_id
    WHERE i.country_id = ?
  `;

  doSQL(SQL_latest, [country_id], res, (rows) => {
    const latest_year = rows[0].latest_year;
    if (!latest_year) {
      res.status(404).send("No existing data for this country.");
      return;
    }
    const next_year = latest_year + 1;

    // 2) Ensure this year exists in years table
    const SQL_insert_year = `
      INSERT INTO years (year_value)
      SELECT ? FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM years WHERE year_value = ?)
    `;
    doSQL(SQL_insert_year, [next_year, next_year], res, () => {
      // 3) Get year_id
      const SQL_year_id = "SELECT year_id FROM years WHERE year_value = ?";
      doSQL(SQL_year_id, [next_year], res, (yearRows) => {
        const year_id = yearRows[0].year_id;

        // 4) Insert new income_shares row
        const SQL_insert_share = `
          INSERT INTO income_shares (country_id, year_id, top1_share)
          VALUES (?, ?, ?)
        `;
        doSQL(SQL_insert_share, [country_id, year_id, new_share], res, () => {
          // 5) Return a small confirmation
          res.render('income/add-next-result', {
            next_year,
            new_share,
          });
        });
      });
    });
  });
});


/* =========================================================
 * 6) Update Income Share for (country, year)
 * =======================================================*/

// GET /income/update-one : show country dropdown and placeholder for years
app.get('/update-one', (req, res) => {
  const SQL = "SELECT country_id, name FROM countries ORDER BY name";
  doSQL(SQL, [], res, (countries) => {
    res.render('income/update-one', {
      countries,
    });
  });
});

// GET /income/update-one/years?country_id=...
// return year dropdown snippet
app.get('/update-one/years', (req, res) => {
  const SQL = `
    SELECT DISTINCT y.year_id, y.year_value
    FROM income_shares i
    JOIN years y ON i.year_id = y.year_id
    WHERE i.country_id = ?
    ORDER BY y.year_value
  `;
  doSQL(SQL, [req.query.country_id], res, (years) => {
    res.render('income/update-one-years', {
      years,
    });
  });
});

// PUT /income/update-one : update one record
app.put('/update-one', (req, res) => {
  const country_id = req.body.country_id;
  const year_id = req.body.year_id;
  const new_share = req.body.top1_share;

  const SQL = `
    UPDATE income_shares
    SET top1_share = ?
    WHERE country_id = ? AND year_id = ?
  `;
  doSQL(SQL, [new_share, country_id, year_id], res, () => {
    res.render('income/update-one-result', {
      message: `Updated income share to ${new_share} for the selected country and year.`,
    });
  });
});


/* =========================================================
 * 7) Delete all Income Shares in year range for a country
 * =======================================================*/

// GET /income/delete-range : show form
app.get('/delete-range', (req, res) => {
  const SQL = "SELECT country_id, name FROM countries ORDER BY name";
  doSQL(SQL, [], res, (countries) => {
    res.render('income/delete-range', {
      countries,
    });
  });
});

// DELETE /income/delete-range
app.delete('/delete-range', (req, res) => {
  const country_id = req.body.country_id;
  const begin_year = req.body.begin_year;
  const end_year = req.body.end_year;

  const SQL = `
    DELETE i
    FROM income_shares i
    JOIN years y ON i.year_id = y.year_id
    WHERE i.country_id = ?
      AND y.year_value BETWEEN ? AND ?
  `;
  doSQL(SQL, [country_id, begin_year, end_year], res, () => {
    res.render('income/delete-range-result', {
      message: `Deleted records for selected country from ${begin_year} to ${end_year}.`,
    });
  });
});


/* =========================================================
 * 8) Extra feature: Top 10 countries by Top1% in a selected year
 * =======================================================*/

// GET /income/extra : show year dropdown
app.get('/extra', (req, res) => {
  const SQL = "SELECT year_id, year_value FROM years ORDER BY year_value";
  doSQL(SQL, [], res, (years) => {
    res.render('income/extra', {
      years,
    });
  });
});

// GET /income/extra/list?year_value=...
app.get('/extra/list', (req, res) => {
  const SQL = `
    SELECT c.name, i.top1_share
    FROM income_shares i
    JOIN countries c ON i.country_id = c.country_id
    JOIN years y ON i.year_id = y.year_id
    WHERE y.year_value = ?
    ORDER BY i.top1_share DESC, c.name
    LIMIT 10
  `;
  doSQL(SQL, [req.query.year_value], res, (records) => {
    res.render('income/extra-list', {
      records,
      year_value: req.query.year_value,
    });
  });
});

module.exports = app;
