const express = require('express');
const router = express.Router();

// API Feature 1: Get country timeline
router.get('/country-timeline/:countryId', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT 
        y.year_value as year, 
        i.top1_share, 
        c.name as country_name
      FROM income_shares i
      JOIN countries c ON i.country_id = c.country_id
      JOIN years y ON i.year_id = y.year_id
      WHERE i.country_id = ?
      ORDER BY y.year_value DESC
    `, [req.params.countryId]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 2: Get sub-region data for a year
router.get('/subregion-data/:subregionName/:year', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT 
        c.name as country_name, 
        i.top1_share
      FROM income_shares i
      JOIN countries c ON i.country_id = c.country_id
      JOIN regions r ON c.region_id = r.region_id
      JOIN years y ON i.year_id = y.year_id
      WHERE r.sub_region_name = ? AND y.year_value = ?
      ORDER BY i.top1_share ASC
    `, [decodeURIComponent(req.params.subregionName), req.params.year]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 3: Get region averages for a year
router.get('/region-averages/:regionName/:year', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT 
        r.sub_region_name as subregion_name,
        AVG(i.top1_share) as avg_share
      FROM income_shares i
      JOIN countries c ON i.country_id = c.country_id
      JOIN regions r ON c.region_id = r.region_id
      JOIN years y ON i.year_id = y.year_id
      WHERE r.region_name = ? AND y.year_value = ?
      GROUP BY r.sub_region_name
      ORDER BY r.sub_region_name, avg_share
    `, [decodeURIComponent(req.params.regionName), req.params.year]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 4: Search countries
router.get('/search-countries', async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const [results] = await req.db.query(`
      SELECT 
        c.name as country_name,
        i.top1_share,
        y.year_value as year
      FROM countries c
      LEFT JOIN income_shares i ON c.country_id = i.country_id
      LEFT JOIN years y ON i.year_id = y.year_id
      WHERE c.name LIKE ? 
        AND y.year_value = (
          SELECT MAX(y2.year_value) 
          FROM income_shares i2 
          JOIN years y2 ON i2.year_id = y2.year_id
          WHERE i2.country_id = c.country_id
        )
      ORDER BY c.name
    `, [`%${keyword}%`]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 5: Add new income share record
router.post('/add-record', async (req, res) => {
  try {
    const { countryId, year, top1Share } = req.body;
    
    // Get or create year_id
    let [yearResult] = await req.db.query(`
      SELECT year_id FROM years WHERE year_value = ?
    `, [year]);
    
    let yearId;
    if (yearResult.length === 0) {
      const [insertYear] = await req.db.query(`
        INSERT INTO years (year_value) VALUES (?)
      `, [year]);
      yearId = insertYear.insertId;
    } else {
      yearId = yearResult[0].year_id;
    }
    
    const [result] = await req.db.query(`
      INSERT INTO income_shares (country_id, year_id, top1_share)
      VALUES (?, ?, ?)
    `, [countryId, yearId, top1Share]);
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get latest year for a country
router.get('/latest-year/:countryId', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT MAX(y.year_value) as latest_year
      FROM income_shares i
      JOIN years y ON i.year_id = y.year_id
      WHERE i.country_id = ?
    `, [req.params.countryId]);
    res.json(results[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get years for a country
router.get('/country-years/:countryId', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT DISTINCT y.year_value as year
      FROM income_shares i
      JOIN years y ON i.year_id = y.year_id
      WHERE i.country_id = ?
      ORDER BY y.year_value DESC
    `, [req.params.countryId]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 6: Update income share record
router.put('/update-record', async (req, res) => {
  try {
    const { countryId, year, top1Share } = req.body;
    
    const [result] = await req.db.query(`
      UPDATE income_shares i
      JOIN years y ON i.year_id = y.year_id
      SET i.top1_share = ?
      WHERE i.country_id = ? AND y.year_value = ?
    `, [top1Share, countryId, year]);
    
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 7: Delete income share records
router.delete('/delete-records', async (req, res) => {
  try {
    const { countryId, startYear, endYear } = req.body;
    
    const [result] = await req.db.query(`
      DELETE i FROM income_shares i
      JOIN years y ON i.year_id = y.year_id
      WHERE i.country_id = ? AND y.year_value BETWEEN ? AND ?
    `, [countryId, startYear, endYear]);
    
    res.json({ success: true, deletedRows: result.affectedRows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Feature 8: Get comparison data for charts
router.get('/comparison-data', async (req, res) => {
  try {
    const { countries, year } = req.query;
    const countryIds = countries.split(',');
    
    const placeholders = countryIds.map(() => '?').join(',');
    const [results] = await req.db.query(`
      SELECT 
        c.name as country_name, 
        i.top1_share, 
        y.year_value as year
      FROM income_shares i
      JOIN countries c ON i.country_id = c.country_id
      JOIN years y ON i.year_id = y.year_id
      WHERE c.country_id IN (${placeholders}) AND y.year_value = ?
      ORDER BY c.name
    `, [...countryIds, year]);
    
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get regional trends
router.get('/regional-trends/:regionName', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT 
        y.year_value as year,
        AVG(i.top1_share) as avg_share
      FROM income_shares i
      JOIN countries c ON i.country_id = c.country_id
      JOIN regions r ON c.region_id = r.region_id
      JOIN years y ON i.year_id = y.year_id
      WHERE r.region_name = ?
      GROUP BY y.year_value
      ORDER BY y.year_value
    `, [decodeURIComponent(req.params.regionName)]);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;