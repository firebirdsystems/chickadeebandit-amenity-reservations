-- upcoming_reservations seeks on date >= :today and orders by (date, start_time).
-- Both columns are plaintext (_date suffix / db_plaintext_columns), so this
-- serves the range seek AND the ordering, and the LIMIT can stop early instead
-- of sorting every reservation the household has ever made.
CREATE INDEX IF NOT EXISTS idx_ar_reservations_date_start
  ON app_amenity_reservations__reservations(date, start_time);
