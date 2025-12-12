const express = require('express');
const router = express.Router();

// Homepage
router.get('/', async (req, res) => {
  res.render('index');
});

// Feature 1: Country timeline
router.get('/feature1', async (req, res) => {
  try {
    const [countries] = await req.db.query(`
      SELECT country_id, name 
      FROM countries 
      ORDER BY name
    `);
    res.render('feature1', { countries });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 2: Sub-region comparison
router.get('/feature2', async (req, res) => {
  try {
    const [subregions] = await req.db.query(`
      SELECT DISTINCT sub_region_name
      FROM regions
      WHERE sub_region_name IS NOT NULL AND sub_region_name != ''
      ORDER BY sub_region_name
    `);
    
    const [years] = await req.db.query(`
      SELECT DISTINCT year_value as year 
      FROM years 
      ORDER BY year_value DESC
    `);
    
    res.render('feature2', { subregions, years });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 3: Region averages
router.get('/feature3', async (req, res) => {
  try {
    const [regions] = await req.db.query(`
      SELECT DISTINCT region_name
      FROM regions
      WHERE region_name IS NOT NULL AND region_name != ''
      ORDER BY region_name
    `);
    
    const [years] = await req.db.query(`
      SELECT DISTINCT year_value as year 
      FROM years 
      ORDER BY year_value DESC
    `);
    
    res.render('feature3', { regions, years });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 4: Country search
router.get('/feature4', async (req, res) => {
  res.render('feature4');
});

// Feature 5: Add new record
router.get('/feature5', async (req, res) => {
  try {
    const [countries] = await req.db.query(`
      SELECT country_id, name 
      FROM countries 
      ORDER BY name
    `);
    res.render('feature5', { countries });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 6: Update record
router.get('/feature6', async (req, res) => {
  try {
    const [countries] = await req.db.query(`
      SELECT country_id, name 
      FROM countries 
      ORDER BY name
    `);
    res.render('feature6', { countries });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 7: Delete records
router.get('/feature7', async (req, res) => {
  try {
    const [countries] = await req.db.query(`
      SELECT country_id, name 
      FROM countries 
      ORDER BY name
    `);
    res.render('feature7', { countries });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

// Feature 8: Custom feature (Visual charts)
router.get('/feature8', async (req, res) => {
  try {
    const [countries] = await req.db.query(`
      SELECT country_id, name 
      FROM countries 
      ORDER BY name
    `);
    
    const [regions] = await req.db.query(`
      SELECT DISTINCT region_name
      FROM regions
      WHERE region_name IS NOT NULL AND region_name != ''
      ORDER BY region_name
    `);
    
    res.render('feature8', { countries, regions });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Database error');
  }
});

module.exports = router;