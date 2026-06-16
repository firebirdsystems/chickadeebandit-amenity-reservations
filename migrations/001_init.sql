CREATE TABLE IF NOT EXISTS app_amenity_reservations__app_settings (
  board_group_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_amenity_reservations__amenities (
  id                          TEXT NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  icon                        TEXT NOT NULL DEFAULT '🏛️',
  location                    TEXT NOT NULL DEFAULT '',
  capacity                    INTEGER NOT NULL DEFAULT 0,
  booking_window_days         INTEGER NOT NULL DEFAULT 30,
  max_duration_hours          REAL NOT NULL DEFAULT 4,
  min_duration_hours          REAL NOT NULL DEFAULT 0.5,
  max_per_household_per_month INTEGER NOT NULL DEFAULT 4,
  requires_approval           INTEGER NOT NULL DEFAULT 0,
  is_active                   INTEGER NOT NULL DEFAULT 1,
  created_by                  TEXT NOT NULL DEFAULT '',
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS app_amenity_reservations__reservations (
  id           TEXT NOT NULL,
  amenity_id   TEXT NOT NULL,
  reserved_by  TEXT NOT NULL,
  date         TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  guest_count  INTEGER NOT NULL DEFAULT 0,
  notes        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'confirmed',
  reviewed_by  TEXT,
  reviewed_at  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_ar_reservations_amenity_date
  ON app_amenity_reservations__reservations (amenity_id, date);

CREATE INDEX IF NOT EXISTS idx_ar_reservations_member
  ON app_amenity_reservations__reservations (reserved_by);
