```mermaid
erDiagram
  REGIONS {
    int region_id PK
    text region_name
    text sub_region_name
    text intermediate_region_name
    text region_code
    text sub_region_code
    text intermediate_region_code
  }

  COUNTRIES {
    int country_id PK
    text name
    text alpha2
    text alpha3
    text country_code
    int region_id FK
  }

  YEARS {
    int year_id PK
    int year_value "UNIQUE"
  }

  INCOME_SHARES {
    int income_share_id PK
    int country_id FK
    int year_id FK
    decimal top1_share
  }

  REGIONS ||--o{ COUNTRIES : "groups"
  COUNTRIES ||--o{ INCOME_SHARES : "has"
  YEARS ||--o{ INCOME_SHARES : "indexes"

