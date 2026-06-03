SELECT
  a.id,
  a.name,
  a.icon,
  a.location,
  a.capacity,
  COUNT(r.id) AS bookings_today
FROM amenities a
LEFT JOIN reservations r
  ON r.amenity_id = a.id
  AND r.household_id = a.household_id
  AND r.date = current_date::text
  AND r.status IN ('pending', 'confirmed')
WHERE a.household_id = current_setting('app.household_id', true)::uuid
  AND a.is_active = 1
GROUP BY a.id, a.name, a.icon, a.location, a.capacity
ORDER BY a.name
LIMIT 20
