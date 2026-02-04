import { inferTimezoneFromLocation, normalizeTimezoneInput } from "../src/core/timezone";

function assertEqual(actual: string | null, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`[check] ${label} expected ${expected}, got ${actual}`);
  }
}

assertEqual(inferTimezoneFromLocation("Glasgow", "UK"), "Europe/London", "Glasgow/UK");
assertEqual(inferTimezoneFromLocation("Sao Paulo", "Brasil"), "America/Sao_Paulo", "Sao Paulo/BR");
assertEqual(normalizeTimezoneInput("Europe/Lisbon"), "Europe/Lisbon", "Explicit TZ");

console.log("[check] onboarding inference ok");
