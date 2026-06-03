/**
 * Mirrors hub-sdk.js utilities for use in logic.js tests (no browser env needed).
 */

export function isAdult(member) {
  return !!member && (member.role === "adult" || member.role === "admin" || member.role === "owner");
}
