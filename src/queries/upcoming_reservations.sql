SELECT
  r.id,
  a.name   AS amenity_name,
  a.icon,
  r.date,
  r.start_time,
  r.end_time,
  r.reserved_by,
  r.status,
  r.guest_count,
  r.notes
FROM reservations r
JOIN amenities a
  ON a.id = r.amenity_id
  AND a.household_id = r.household_id
WHERE r.household_id = current_setting('app.household_id', true)::uuid
  AND r.status IN ('pending', 'confirmed')
  AND r.date >= current_date::text
ORDER BY r.date, r.start_time
LIMIT 50
