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
FROM app_amenity_reservations__reservations r
JOIN app_amenity_reservations__amenities a
  ON a.id = r.amenity_id
WHERE r.status IN ('pending', 'confirmed')
  AND r.date >= CURRENT_DATE
ORDER BY r.date, r.start_time
LIMIT 50
