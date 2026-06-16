SELECT
  a.id,
  a.name,
  a.icon,
  a.location,
  a.capacity,
  COUNT(r.id) AS bookings_today
FROM app_amenity_reservations__amenities a
LEFT JOIN app_amenity_reservations__reservations r
  ON r.amenity_id = a.id
  AND r.date = CURRENT_DATE
  AND r.status IN ('pending', 'confirmed')
WHERE a.is_active = 1
GROUP BY a.id, a.name, a.icon, a.location, a.capacity
ORDER BY a.name
LIMIT 20
