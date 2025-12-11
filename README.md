```mermaid
erDiagram
  REGION {
    int region_id PK
    string name
    string code
  }

  SUBREGION {
    int subregion_id PK
    int region_id FK
    string name
    string code
  }

  INTERMEDIATEREGION {
    int intermediate_region_id PK
    int subregion_id FK
    string name
    string code
  }

  COUNTRY {
    int country_id PK
    int subregion_id FK
    int intermediate_region_id FK
    string name
    string iso_alpha2
    string iso_alpha3
    string numeric_code
    string iso_3166_2
  }

  INCOMESHARE {
    int income_share_id PK
    int country_id FK
    int year
    float top1_share
    datetime created_at
  }

  REGION ||--o{ SUBREGION : "has"
  SUBREGION ||--o{ INTERMEDIATEREGION : "has"
  SUBREGION ||--o{ COUNTRY : "has"
  INTERMEDIATEREGION ||--o{ COUNTRY : "has"
  COUNTRY ||--o{ INCOMESHARE : "has yearly"
