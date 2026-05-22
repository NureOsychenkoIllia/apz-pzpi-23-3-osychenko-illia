import { describe, expect, it } from "vitest";

import { mapBackendRole, normalizeTrip } from "@/lib/mappers";

describe("mapBackendRole", () => {
  it("maps backend role names to app roles", () => {
    expect(mapBackendRole("technical_admin")).toBe("tech_admin");
    expect(mapBackendRole("business_admin")).toBe("business_admin");
    expect(mapBackendRole("dispatcher")).toBe("dispatcher");
  });
});

describe("normalizeTrip", () => {
  it("normalizes backend trip payload", () => {
    const trip = normalizeTrip({
      id: 12,
      scheduled_departure: "2026-05-21T08:00:00.000Z",
      current_passengers: 20,
      bus_id: 4,
      bus: { capacity: 50 },
      route: {
        origin_city: "Kyiv",
        destination_city: "Lviv",
        base_price: 750,
        distance_km: 540,
        estimated_duration_minutes: 120,
      },
      status: "in_progress",
    });

    expect(trip.from).toBe("Kyiv");
    expect(trip.to).toBe("Lviv");
    expect(trip.loadPct).toBe(40);
    expect(trip.basePrice).toBe(750);
    expect(trip.lat).toBeTypeOf("number");
    expect(trip.lng).toBeTypeOf("number");
  });
});
