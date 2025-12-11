-- ====================================================================
-- ETL SCRIPT FOR Income Share DATABASE (DOCKER INIT VERSION)
-- ====================================================================

-- Create DB if missing and use it
CREATE DATABASE IF NOT EXISTS Final;
USE Final;

-- ====================================================================
-- 1. DROP TABLES IF EXISTS (SAFE RE-RUN)
-- ====================================================================

DROP TABLE IF EXISTS income_shares;
DROP TABLE IF EXISTS years;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS regions;

DROP TABLE IF EXISTS staging_data1;
DROP TABLE IF EXISTS staging_data2;

-- ====================================================================
-- 2. CREATE CORE DIMENSION TABLES
-- ====================================================================

CREATE TABLE regions (
    region_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    region_name TEXT,
    sub_region_name TEXT,
    intermediate_region_name TEXT,
    region_code TEXT,
    sub_region_code TEXT,
    intermediate_region_code TEXT
) ENGINE=InnoDB;

CREATE TABLE countries (
    country_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    alpha2 TEXT,
    alpha3 TEXT,
    country_code TEXT,
    region_id INT UNSIGNED,
    CONSTRAINT fk_countries_regions
        FOREIGN KEY (region_id) REFERENCES regions(region_id)
) ENGINE=InnoDB;

CREATE TABLE years (
    year_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    year_value INT NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE income_shares (
    income_share_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_id INT UNSIGNED,
    year_id INT UNSIGNED,
    top1_share DECIMAL(10,4),
    CONSTRAINT fk_income_country
        FOREIGN KEY (country_id) REFERENCES countries(country_id),
    CONSTRAINT fk_income_year
        FOREIGN KEY (year_id) REFERENCES years(year_id)
) ENGINE=InnoDB;

-- ====================================================================
-- 3. CREATE STAGING TABLES
-- ====================================================================

CREATE TABLE staging_data2 (
    name TEXT,
    alpha2 TEXT,
    alpha3 TEXT,
    country_code TEXT,
    ISO VARCHAR(99),
    region TEXT,
    sub_region TEXT,
    intermediate_region TEXT,
    region_code TEXT,
    sub_region_code TEXT,
    intermediate_region_code TEXT
);

CREATE TABLE staging_data1 (
    entity TEXT,
    code TEXT,
    year INTEGER,
    richest_income_share NUMERIC
);

-- ====================================================================
-- 4. LOAD RAW CSV DATA
-- ====================================================================

-- CSVs must be visible at /var/lib/mysql-files inside container
-- We'll mount that directory from Windows in docker run.

LOAD DATA INFILE '/var/lib/mysql-files/data1.csv'
INTO TABLE staging_data1
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

LOAD DATA INFILE '/var/lib/mysql-files/data2.csv'
INTO TABLE staging_data2
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(name, alpha2, alpha3, country_code,
 ISO, region, sub_region, intermediate_region,
 region_code, sub_region_code, intermediate_region_code);

-- ====================================================================
-- 5. CLEAN RAW STAGING DATA
-- ====================================================================

DELETE FROM staging_data1
WHERE code IS NULL
   OR code = ''
   OR year IS NULL
   OR year = ''
   OR richest_income_share IS NULL
   OR richest_income_share = 0;

DELETE FROM staging_data2
WHERE region = ''
  AND sub_region = ''
  AND intermediate_region = '';

-- ====================================================================
-- 6. POPULATE DIMENSION TABLES
-- ====================================================================

INSERT INTO regions (
    region_name,
    sub_region_name,
    intermediate_region_name,
    region_code,
    sub_region_code,
    intermediate_region_code
)
SELECT DISTINCT
    region,
    sub_region,
    intermediate_region,
    region_code,
    sub_region_code,
    intermediate_region_code
FROM staging_data2;

INSERT INTO countries (name, alpha2, alpha3, country_code, region_id)
SELECT
    s.name,
    s.alpha2,
    s.alpha3,
    s.country_code,
    r.region_id
FROM staging_data2 s
LEFT JOIN regions r
    ON  s.region = r.region_name
    AND s.sub_region = r.sub_region_name
    AND (
            s.intermediate_region = r.intermediate_region_name
         OR (s.intermediate_region IS NULL AND r.intermediate_region_name IS NULL)
        );

INSERT INTO years (year_value)
SELECT DISTINCT year
FROM staging_data1
WHERE year IS NOT NULL
ORDER BY year;

-- ====================================================================
-- 7. POPULATE FACT TABLE
-- ====================================================================

INSERT INTO income_shares (country_id, year_id, top1_share)
SELECT
    c.country_id,
    y.year_id,
    s.richest_income_share
FROM staging_data1 s
JOIN countries c
    ON s.code = c.alpha3
JOIN years y
    ON s.year = y.year_value;

-- ====================================================================
-- 8. DROP STAGING TABLES
-- ====================================================================

DROP TABLE staging_data1;
DROP TABLE staging_data2;
