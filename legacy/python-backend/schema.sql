PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    image_url TEXT,
    hours_info TEXT NOT NULL DEFAULT 'Orari non specificati'
);

CREATE INDEX IF NOT EXISTS idx_gyms_discipline ON gyms(discipline);
CREATE INDEX IF NOT EXISTS idx_gyms_city ON gyms(city);
CREATE INDEX IF NOT EXISTS idx_gyms_address ON gyms(address);
