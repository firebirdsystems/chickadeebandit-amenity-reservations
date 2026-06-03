import { expect, test } from "vitest";
import {
  isBoard, timesToMinutes, durationHours,
  hasConflict, isWithinLimits, isWithinBookingWindow,
} from "../src/logic.js";

// ── isBoard ────────────────────────────────────────────────────────────────────

test("all adults are board when no group configured", () => {
  expect(isBoard({ id: "a1", role: "adult" }, [], "")).toBe(true);
});

test("children are never board", () => {
  expect(isBoard({ id: "c1", role: "child" }, [], "")).toBe(false);
});

test("null member is not board", () => {
  expect(isBoard(null, [], "")).toBe(false);
});

test("adult in board group is board", () => {
  const groups = [{ id: "g1", memberIds: ["a1", "a2"] }];
  expect(isBoard({ id: "a1", role: "adult" }, groups, "g1")).toBe(true);
});

test("adult not in board group is not board", () => {
  const groups = [{ id: "g1", memberIds: ["a1", "a2"] }];
  expect(isBoard({ id: "a3", role: "adult" }, groups, "g1")).toBe(false);
});

test("falls back to all adults when configured group no longer exists", () => {
  expect(isBoard({ id: "a1", role: "adult" }, [], "deleted-group-id")).toBe(true);
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

test("today is within any booking window", () => {
  const today = new Date().toISOString().slice(0, 10);
  expect(isWithinBookingWindow(today, 30)).toBe(true);
});

test("past date is outside window", () => {
  expect(isWithinBookingWindow("2020-01-01", 30)).toBe(false);
});

test("date just beyond window is outside", () => {
  const beyond = new Date();
  beyond.setDate(beyond.getDate() + 31);
  expect(isWithinBookingWindow(beyond.toISOString().slice(0, 10), 30)).toBe(false);
});

test("date exactly at window boundary is within", () => {
  const boundary = new Date();
  boundary.setDate(boundary.getDate() + 30);
  expect(isWithinBookingWindow(boundary.toISOString().slice(0, 10), 30)).toBe(true);
});
