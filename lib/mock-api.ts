import { dashboardSnapshot, dispatchConfiguration } from "@/lib/mock-data";
import type { AlertItem, DashboardSnapshot, DispatchConfiguration, Driver, DriverStatus, RealtimeEvent, ServiceZone, ServiceZoneCreateRequest, SupportTicket, SupportTicketRequest, TripRequest, TripRequestCreateInput, Vehicle, VehicleStatus } from "@/lib/types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const supportTickets: SupportTicket[] = [];

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  await wait(250);
  return structuredClone(dashboardSnapshot);
}

export async function fetchVehicles() {
  await wait(200);
  return structuredClone(dashboardSnapshot.vehicles);
}

export async function fetchDrivers() {
  await wait(180);
  return structuredClone(dashboardSnapshot.drivers);
}

export async function fetchDispatchRecommendations() {
  await wait(220);
  return structuredClone(dashboardSnapshot.recommendations);
}

export async function reassignTrip(requestId: string, vehicleId: string): Promise<TripRequest> {
  await wait(250);

  const trip = dashboardSnapshot.requests.find((request) => request.requestId === requestId);
  const vehicle = dashboardSnapshot.vehicles.find((candidate) => candidate.vehicleId === vehicleId);

  if (!trip) {
    throw new Error(`Trip ${requestId} was not found.`);
  }

  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} was not found.`);
  }

  trip.vehicleId = vehicle.vehicleId;
  trip.status = "Assigned";
  vehicle.available = false;
  vehicle.status = "Assigned";

  return structuredClone(trip);
}

export async function cancelTrip(requestId: string): Promise<TripRequest> {
  await wait(200);

  const trip = dashboardSnapshot.requests.find((request) => request.requestId === requestId);

  if (!trip) {
    throw new Error(`Trip ${requestId} was not found.`);
  }

  trip.status = "Cancelled";
  trip.vehicleId = undefined;

  return structuredClone(trip);
}

export async function updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle> {
  await wait(200);
  const vehicle = dashboardSnapshot.vehicles.find((candidate) => candidate.vehicleId === vehicleId);
  if (!vehicle) throw new Error(`Vehicle ${vehicleId} was not found.`);
  vehicle.status = status;
  vehicle.available = status === "Available";
  return structuredClone(vehicle);
}

export async function updateDriverStatus(driverId: string, status: DriverStatus): Promise<Driver> {
  await wait(200);
  const driver = dashboardSnapshot.drivers.find((candidate) => candidate.driverId === driverId);
  if (!driver) throw new Error(`Driver ${driverId} was not found.`);
  driver.status = status;
  return structuredClone(driver);
}

export async function toggleZoneStatus(zoneId: string): Promise<ServiceZone> {
  await wait(200);
  const zone = dashboardSnapshot.serviceZones.find((candidate) => candidate.id === zoneId);
  if (!zone) throw new Error(`Zone ${zoneId} was not found.`);
  zone.status = zone.status === "active" ? "paused" : "active";
  return structuredClone(zone);
}

export async function createServiceZone(request: ServiceZoneCreateRequest): Promise<ServiceZone> {
  await wait(250);
  const normalizedName = request.name.trim();
  if (dashboardSnapshot.serviceZones.some((zone) => zone.name.toLowerCase() === normalizedName.toLowerCase())) {
    throw new Error(`Service zone ${normalizedName} already exists.`);
  }

  const zone: ServiceZone = {
    id: `zone-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: normalizedName,
    status: "active",
    coverage: request.coverage.trim(),
    operatingHours: request.operatingHours,
    pickups: 0,
    dropoffs: 0,
  };
  dashboardSnapshot.serviceZones.push(zone);
  dashboardSnapshot.summary.serviceZones = dashboardSnapshot.serviceZones.length;
  return structuredClone(zone);
}

export async function acknowledgeAlert(alertId: string): Promise<AlertItem> {
  await wait(150);
  const alert = dashboardSnapshot.alerts.find((candidate) => candidate.id === alertId);
  if (!alert) throw new Error(`Alert ${alertId} was not found.`);
  alert.status = "acknowledged";
  return structuredClone(alert);
}

export async function createSupportTicket(request: SupportTicketRequest): Promise<SupportTicket> {
  await wait(200);
  const ticket: SupportTicket = { id: `ticket-${supportTickets.length + 1}`, ...request, status: "open", createdAt: new Date().toISOString() };
  supportTickets.unshift(ticket);
  return structuredClone(ticket);
}

export async function createTripRequest(input: TripRequestCreateInput): Promise<TripRequest> {
  await wait(250);
  const requestId = `req-${4400 + dashboardSnapshot.requests.length + 1}`;
  const trip: TripRequest = {
    requestId,
    passenger: { passengerId: `pax-${requestId}`, name: input.passengerName, wheelchairAccessible: input.wheelchairRequired, passengerCount: input.passengerCount },
    pickupLocation: { id: `${requestId}-pickup`, latitude: 40.7128, longitude: -74.006, zone: input.pickupZone },
    dropoffLocation: { id: `${requestId}-dropoff`, latitude: 40.7228, longitude: -74.001, zone: input.dropoffZone },
    requestedPickupTime: input.requestedPickupTime,
    requestedDropoffTime: "",
    pickupTimeWindow: { start: input.requestedPickupTime, end: input.requestedPickupTime },
    dropoffTimeWindow: { start: "", end: "" },
    maxWaitMinutes: 15,
    maxRideMinutes: 45,
    maxDetourMinutes: 10,
    serviceZone: input.pickupZone,
    wheelchairRequired: input.wheelchairRequired,
    preferredVehicleType: input.wheelchairRequired ? "WHEELCHAIR_ACCESSIBLE" : "STANDARD",
    sourceSystem: "operator-web",
    status: "Unassigned",
    eta: "Pending dispatch",
  };
  dashboardSnapshot.requests.unshift(trip);
  dashboardSnapshot.summary.unassignedRequests += 1;
  dashboardSnapshot.summary.activeTrips += 1;
  return structuredClone(trip);
}

export async function fetchDispatchConfiguration(): Promise<DispatchConfiguration> {
  await wait(150);
  return structuredClone(dispatchConfiguration);
}

export async function updateDispatchConfiguration(configuration: DispatchConfiguration): Promise<DispatchConfiguration> {
  await wait(250);
  Object.assign(dispatchConfiguration, configuration);
  return structuredClone(dispatchConfiguration);
}

export function subscribeToRealtime(callback: (event: RealtimeEvent) => void) {
  const events: RealtimeEvent[] = [
    {
      type: "vehicle",
      message: "Vehicle 201 reported a 3-minute delay near Midtown.",
      severity: "medium",
      timestamp: new Date().toISOString(),
    },
    {
      type: "alert",
      message: "Unassigned request req-4401 requires manual intervention.",
      severity: "high",
      timestamp: new Date().toISOString(),
    },
    {
      type: "trip",
      message: "Trip req-4422 is boarding and estimated to depart in 3 minutes.",
      severity: "low",
      timestamp: new Date().toISOString(),
    },
    {
      type: "dispatch",
      message: "Dispatch engine recommended a reassignment for Downtown route cluster.",
      severity: "medium",
      timestamp: new Date().toISOString(),
    },
  ];

  const intervalId = globalThis.setInterval(() => {
    const next = events[Math.floor(Math.random() * events.length)];
    callback({ ...next, timestamp: new Date().toISOString() });
  }, 15000);

  return () => globalThis.clearInterval(intervalId);
}
