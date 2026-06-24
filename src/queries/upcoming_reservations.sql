SELECT
  r.id,
  a.name   AS amenity_name,
  a.icon,
  r.date,
  r.start_time,
  r.end_time,
  r.reserved_by,
  CASE
    WHEN rv.decision IS NOT NULL THEN rv.decision
    WHEN a.requires_approval = 1  THEN 'pending'
    ELSE 'confirmed'
  END AS status,
  r.guest_count,
  r.notes
FROM app_amenity_reservations__reservations r
JOIN app_amenity_reservations__amenities a
  ON a.id = r.amenity_id
LEFT JOIN app_amenity_reservations__reviews rv
  ON rv.reservation_id = r.id
WHERE r.status <> 'cancelled'
  AND COALESCE(rv.decision, '') <> 'denied'
  AND r.date >= CURRENT_DATE
ORDER BY r.date, r.start_time
LIMIT 50
