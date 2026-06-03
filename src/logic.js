import { isAdult } from "./shared.js";
export { isAdult };

/**
 * Returns true if `me` has board-level access.
 * When no board group is configured, all adults qualify.
 * If the configured group is deleted, falls back to all adults.
 */
export function isBoard(me, groups, boardGroupId) {
  if (!isAdult(me)) return false;
  if (!boardGroupId) return true;
  const g = groups.find(g => g.id === boardGroupId);
  return g ? g.memberIds.includes(me.id) : true;
}

/** Converts "HH:MM" to minutes since midnight. */
export function timesToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Returns the duration in fractional hours between two "HH:MM" strings. */
export function durationHours(start, end) {
  return (timesToMinutes(end) - timesToMinutes(start)) / 60;
}

/**
 * Returns true if [newStart, newEnd) overlaps any existing reservation
 * such that the booking would be blocked.
 *
 * capacity === 0  → single-occupancy (any overlap = conflict)
 * capacity > 0    → multi-occupancy; conflict when all slots are filled
 */
export function hasConflict(newStart, newEnd, existing, capacity) {
  const ns = timesToMinutes(newStart);
  const ne = timesToMinutes(newEnd);
  const overlapping = existing.filter(r => {
    if (r.status === "cancelled" || r.status === "denied") return false;
    const rs = timesToMinutes(r.start_time);
    const re = timesToMinutes(r.end_time);
    return ns < re && ne > rs;
  });
  if (capacity === 0) return overlapping.length > 0;
  return overlapping.length >= capacity;
}

/**
 * Returns true if `memberId` is under their calendar-month limit
 * for `amenityId` in the month containing `newDate`.
 *
 * maxPerMonth === 0 means unlimited.
 */
export function isWithinLimits(memberId, amenityId, newDate, reservations, maxPerMonth) {
  if (maxPerMonth === 0) return true;
  const [year, month] = newDate.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd   = `${year}-${String(month).padStart(2, "0")}-31`;
  const count = reservations.filter(r =>
    r.reserved_by === memberId &&
    r.amenity_id === amenityId &&
    (r.status === "confirmed" || r.status === "pending") &&
    r.date >= monthStart &&
    r.date <= monthEnd
  ).length;
  return count < maxPerMonth;
}

/**
 * Returns true if `date` (YYYY-MM-DD) falls within today through
 * today + windowDays (inclusive).
 */
export function isWithinBookingWindow(date, windowDays) {
  const today = new Date().toISOString().slice(0, 10);
  const limit = new Date();
  limit.setDate(limit.getDate() + windowDays);
  const limitStr = limit.toISOString().slice(0, 10);
  return date >= today && date <= limitStr;
}
