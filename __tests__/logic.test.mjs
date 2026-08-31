import { expect, test } from "vitest";
import {
  isBoard, timesToMinutes, durationHours,
  hasConflict, isWithinLimits, isWithinBookingWindow, searchableFields,
} from "../src/logic.js";
import { testPrivilegedGateContract } from "./helpers/privileged-gate.mjs";

// ── isBoard ────────────────────────────────────────────────────────────────────
// isBoard fronts the `amenities` / `reviews` insert_privileged_only policies, so
// it must satisfy the shared privileged-gate contract (mirrors the hub: no adult
// fallback when no board group is configured).

testPrivilegedGateContract("isBoard", isBoard, {
  member:   { id: "a1", role: "adult" },
  outsider: { id: "a3", role: "adult" },
  groups:   [{ id: "g1", memberIds: ["a1", "a2"] }],
  groupId:  "g1",
});

// App-specific: board access additionally requires adulthood, so a child IN the
// group is still not board (stricter than the hub, never looser — safe).
test("a child in the board group is still not board (adults only)", () => {
  const groups = [{ id: "g1", memberIds: ["a1", "c1"] }];
  expect(isBoard({ id: "c1", role: "child" }, groups, "g1")).toBe(false);
});

// ── timesToMinutes / durationHours ─────────────────────────────────────────────

test("timesToMinutes converts HH:MM", () => {
  expect(timesToMinutes("00:00")).toBe(0);
  expect(timesToMinutes("09:00")).toBe(540);
  expect(timesToMinutes("13:30")).toBe(810);
  expect(timesToMinutes("23:59")).toBe(1439);
});

test("durationHours calculates whole hours", () => {
  expect(durationHours("09:00", "11:00")).toBe(2);
  expect(durationHours("08:00", "09:00")).toBe(1);
});

test("durationHours calculates fractional hours", () => {
  expect(durationHours("09:30", "11:00")).toBeCloseTo(1.5);
  expect(durationHours("10:00", "10:30")).toBeCloseTo(0.5);
});

// ── hasConflict ────────────────────────────────────────────────────────────────

const confirmed = [{ start_time: "10:00", end_time: "12:00", status: "confirmed" }];

test("overlapping slot conflicts with single-occupancy amenity", () => {
  expect(hasConflict("11:00", "13:00", confirmed, 0)).toBe(true);
});

test("no conflict when new slot starts exactly at end of existing", () => {
  expect(hasConflict("12:00", "14:00", confirmed, 0)).toBe(false);
});

test("no conflict when new slot ends exactly at start of existing", () => {
  expect(hasConflict("08:00", "10:00", confirmed, 0)).toBe(false);
});

test("allows concurrent booking when under capacity", () => {
  expect(hasConflict("11:00", "13:00", confirmed, 2)).toBe(false);
});

test("conflicts when all capacity slots are filled", () => {
  const two = [
    { start_time: "10:00", end_time: "12:00", status: "confirmed" },
    { start_time: "10:30", end_time: "12:00", status: "confirmed" },
  ];
  expect(hasConflict("11:00", "13:00", two, 2)).toBe(true);
});

test("cancelled reservations do not block booking", () => {
  const withCancelled = [{ start_time: "10:00", end_time: "12:00", status: "cancelled" }];
  expect(hasConflict("10:00", "12:00", withCancelled, 0)).toBe(false);
});

test("denied reservations do not block booking", () => {
  const withDenied = [{ start_time: "10:00", end_time: "12:00", status: "denied" }];
  expect(hasConflict("10:00", "12:00", withDenied, 0)).toBe(false);
});

// ── isWithinLimits ─────────────────────────────────────────────────────────────

test("unlimited (maxPerMonth=0) always returns true", () => {
  expect(isWithinLimits("u1", "a1", "2026-06-10", [], 0)).toBe(true);
});

test("returns true when under monthly limit", () => {
  const reservations = [
    { reserved_by: "u1", amenity_id: "a1", status: "confirmed", date: "2026-06-01" },
    { reserved_by: "u1", amenity_id: "a1", status: "confirmed", date: "2026-06-05" },
  ];
  expect(isWithinLimits("u1", "a1", "2026-06-10", reservations, 4)).toBe(true);
});

test("returns false when at monthly limit", () => {
  const reservations = Array.from({ length: 4 }, (_, i) => ({
    reserved_by: "u1",
    amenity_id: "a1",
    status: "confirmed",
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
  }));
  expect(isWithinLimits("u1", "a1", "2026-06-10", reservations, 4)).toBe(false);
});

test("reservations in other months do not count toward limit", () => {
  const reservations = [
    { reserved_by: "u1", amenity_id: "a1", status: "confirmed", date: "2026-05-30" },
    { reserved_by: "u1", amenity_id: "a1", status: "confirmed", date: "2026-07-01" },
  ];
  expect(isWithinLimits("u1", "a1", "2026-06-10", reservations, 2)).toBe(true);
});

test("pending reservations count toward limit", () => {
  const reservations = Array.from({ length: 3 }, (_, i) => ({
    reserved_by: "u1",
    amenity_id: "a1",
    status: i === 0 ? "pending" : "confirmed",
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
  }));
  expect(isWithinLimits("u1", "a1", "2026-06-10", reservations, 3)).toBe(false);
});

test("other members' reservations do not count toward my limit", () => {
  const reservations = Array.from({ length: 4 }, (_, i) => ({
    reserved_by: "u2",
    amenity_id: "a1",
    status: "confirmed",
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
  }));
  expect(isWithinLimits("u1", "a1", "2026-06-10", reservations, 4)).toBe(true);
});

// ── isWithinBookingWindow ──────────────────────────────────────────────────────

// The day is passed in explicitly — it is the household's, from hub-sdk
// `hubToday()`, in the browser. Pinning it here also makes these deterministic:
// they used to derive the boundary with `toISOString()` off an ambient `new
// Date()`, which is the very UTC idiom the implementation had to stop using.
const TODAY = "2026-06-15";

test("today is within any booking window", () => {
  expect(isWithinBookingWindow(TODAY, 30, TODAY)).toBe(true);
});

test("past date is outside window", () => {
  expect(isWithinBookingWindow("2020-01-01", 30, TODAY)).toBe(false);
});

test("date just beyond window is outside", () => {
  expect(isWithinBookingWindow("2026-07-16", 30, TODAY)).toBe(false);
});

test("date exactly at window boundary is within", () => {
  expect(isWithinBookingWindow("2026-07-15", 30, TODAY)).toBe(true);
});

test("the window crosses a month end without drifting", () => {
  // Calendar arithmetic, not a fixed 86_400_000 step: a DST boundary inside the
  // window used to move the far edge by an hour and, at the extreme, a day.
  expect(isWithinBookingWindow("2026-04-14", 30, "2026-03-15")).toBe(true);
  expect(isWithinBookingWindow("2026-04-15", 30, "2026-03-15")).toBe(false);
});

test("falls back to the device calendar, never UTC, when no day is passed", () => {
  // The regression: west of Greenwich, UTC "today" is tomorrow's date all
  // evening, so a same-day booking was refused as being in the past.
  const d = new Date();
  const deviceToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  expect(isWithinBookingWindow(deviceToday, 30)).toBe(true);
});

describe("searchableFields", () => {
  it("matches on the location, not just the amenity name", () => {
    const fields = searchableFields({ name: "Studio", description: "yoga and classes", location: "by the pool" });
    expect(fields).toContain("by the pool");
    expect(fields).toContain("yoga and classes");
  });
});
