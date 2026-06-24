-- Key/value settings table (replaces single-row app_settings) so the board-group
-- pointer can be protected by a row policy (settings = adult_only) and read by the
-- bypass_group_setting machinery. Without this, any member could rewrite
-- board_group_id and crown themselves the board.
CREATE TABLE IF NOT EXISTS app_amenity_reservations__settings (
  key   TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO app_amenity_reservations__settings (key, value)
  SELECT 'board_group_id', board_group_id
  FROM app_amenity_reservations__app_settings
  WHERE board_group_id <> '';

-- Visibility columns so reservations/amenities stay readable by everyone
-- (owner_or_visibility, everyone_values=['everyone']) while writes are owner/board only.
ALTER TABLE app_amenity_reservations__reservations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE app_amenity_reservations__amenities ADD COLUMN visibility TEXT NOT NULL DEFAULT 'everyone';

-- Board approve/deny decisions live in a board-only child table
-- (inherit_visibility + insert_privileged_only). A member cannot confirm/deny their
-- own (or anyone's) request by writing the reservation row: effective status is
-- derived from this table, which only the board group may INSERT into.
CREATE TABLE IF NOT EXISTS app_amenity_reservations__reviews (
  reservation_id TEXT NOT NULL PRIMARY KEY,
  decision       TEXT NOT NULL,
  reviewed_by    TEXT NOT NULL,
  reviewed_at    TEXT NOT NULL
);

INSERT OR IGNORE INTO app_amenity_reservations__reviews (reservation_id, decision, reviewed_by, reviewed_at)
  SELECT id, status, reviewed_by, COALESCE(reviewed_at, updated_at)
  FROM app_amenity_reservations__reservations
  WHERE status IN ('confirmed', 'denied') AND reviewed_by IS NOT NULL AND reviewed_by <> '';
