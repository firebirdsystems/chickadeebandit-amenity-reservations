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
  AND r.date = :today
  AND r.status <> 'cancelled'
LEFT JOIN app_amenity_reservations__reviews rv
  ON rv.reservation_id = r.id
  AND rv.decision = 'denied'
WHERE a.is_active = 1
  AND rv.reservation_id IS NULL
GROUP BY a.id, a.name, a.icon, a.location, a.capacity
ORDER BY a.name
LIMIT 20
