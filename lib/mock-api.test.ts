import { describe, expect, it } from "vitest";

import { acknowledgeAlert, cancelTrip, createServiceZone, createSupportTicket, createTripRequest, fetchDashboardSnapshot, fetchDispatchConfiguration, reassignTrip, toggleZoneStatus, updateDispatchConfiguration, updateDriverStatus, updateVehicleStatus } from "./mock-api";

describe("mock DRT platform API", () => {
  it("returns an independently mutable snapshot matching dashboard counters", async () => {
    const snapshot = await fetchDashboardSnapshot();

    expect(snapshot.vehicles.length).toBeGreaterThan(0);
    expect(snapshot.requests).toHaveLength(3);
    expect(snapshot.summary.serviceZones).toBe(snapshot.serviceZones.length);

    snapshot.vehicles[0].status = "Emergency";
    const subsequentSnapshot = await fetchDashboardSnapshot();

    expect(subsequentSnapshot.vehicles[0].status).toBe("Available");
  });

  it("assigns a trip to an available vehicle in the mock network", async () => {
    const reassignedTrip = await reassignTrip("req-4401", "veh-201");
    const snapshot = await fetchDashboardSnapshot();
    const vehicle = snapshot.vehicles.find((candidate) => candidate.vehicleId === "veh-201");

    expect(reassignedTrip.status).toBe("Assigned");
    expect(reassignedTrip.vehicleId).toBe("veh-201");
    expect(vehicle?.available).toBe(false);
  });

  it("cancels a trip and clears its vehicle assignment", async () => {
    const cancelledTrip = await cancelTrip("req-4408");

    expect(cancelledTrip.status).toBe("Cancelled");
    expect(cancelledTrip.vehicleId).toBeUndefined();
  });

  it("updates fleet, driver, and zone operations state", async () => {
    const vehicle = await updateVehicleStatus("veh-201", "Maintenance");
    const driver = await updateDriverStatus("drv-101", "Break");
    const zone = await toggleZoneStatus("zone-downtown");

    expect(vehicle.status).toBe("Maintenance");
    expect(driver.status).toBe("Break");
    expect(zone.status).toBe("paused");
  });

  it("persists operator dispatch configuration", async () => {
    await updateDispatchConfiguration({ ...(await fetchDispatchConfiguration()), maxWaitMinutes: 18, dispatchRule: "Shortest ETA" });
    const configuration = await fetchDispatchConfiguration();

    expect(configuration.maxWaitMinutes).toBe(18);
    expect(configuration.dispatchRule).toBe("Shortest ETA");
  });

  it("creates an active service zone", async () => {
    const zone = await createServiceZone({ name: "River North", coverage: "River corridor", operatingHours: "06:00 - 22:00" });

    expect(zone.status).toBe("active");
    expect((await fetchDashboardSnapshot()).serviceZones.some((candidate) => candidate.id === zone.id)).toBe(true);
  });

  it("acknowledges an operational alert", async () => {
    const alert = await acknowledgeAlert("alert-1");

    expect(alert.status).toBe("acknowledged");
  });

  it("creates a support ticket", async () => {
    const ticket = await createSupportTicket({ subject: "Pickup assistance", description: "Passenger needs help locating pickup point.", priority: "high" });

    expect(ticket.id).toBe("ticket-1");
    expect(ticket.status).toBe("open");
  });

  it("queues a newly created trip request for dispatch", async () => {
    const trip = await createTripRequest({ passengerName: "Sam Ortega", passengerCount: 1, pickupZone: "Downtown", dropoffZone: "Uptown", requestedPickupTime: "2026-09-03T10:30", wheelchairRequired: false });

    expect(trip.status).toBe("Unassigned");
    expect((await fetchDashboardSnapshot()).requests[0].requestId).toBe(trip.requestId);
  });
});