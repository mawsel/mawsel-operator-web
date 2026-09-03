import type { AlertItem, DashboardSnapshot, DispatchConfiguration, DispatchRecommendation, Driver, DriverStatus, Location, ServiceZone, ServiceZoneCreateRequest, SupportTicket, SupportTicketRequest, TripRequest, TripRequestCreateInput, Vehicle, VehicleStatus } from "@/lib/types";
import {
  acknowledgeAlert,
  cancelTrip,
  createSupportTicket,
  createServiceZone,
  createTripRequest,
  fetchDashboardSnapshot,
  fetchDispatchConfiguration,
  fetchDispatchRecommendations,
  fetchDrivers,
  fetchVehicles,
  reassignTrip,
  toggleZoneStatus,
  updateDriverStatus,
  updateVehicleStatus,
  updateDispatchConfiguration,
} from "@/lib/mock-api";

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const platformApiUrl = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";
const dispatchApiUrl = process.env.NEXT_PUBLIC_DISPATCH_API_URL ?? platformApiUrl;

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value !== null && typeof value === "object" ? value as ApiRecord : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLocation(value: unknown, id: string): Location {
  const location = asRecord(value);
  return {
    id: asString(location.id, `${id}-location`),
    latitude: asNumber(location.latitude),
    longitude: asNumber(location.longitude),
    zone: asString(location.zone, "Unassigned"),
  };
}

function normalizeVehicleStatus(value: unknown, available: boolean): VehicleStatus {
  const allowedStatuses: VehicleStatus[] = ["Offline", "Available", "Assigned", "En route", "Boarding", "In trip", "Break", "Maintenance", "Emergency"];
  return allowedStatuses.includes(value as VehicleStatus) ? value as VehicleStatus : available ? "Available" : "Assigned";
}

function normalizeVehicle(value: unknown, index: number): Vehicle {
  const vehicle = asRecord(value);
  const vehicleId = asString(vehicle.vehicleId ?? vehicle.id ?? vehicle.externalId, `vehicle-${index + 1}`);
  const available = typeof vehicle.available === "boolean" ? vehicle.available : false;
  const capacity = asRecord(vehicle.capacity);

  return {
    vehicleId,
    operatorId: asString(vehicle.operatorId, "unknown"),
    type: "STANDARD",
    capacity: { seats: asNumber(capacity.seats ?? vehicle.capacity), wheelchairs: asNumber(capacity.wheelchairs), maxPassengers: asNumber(capacity.maxPassengers ?? vehicle.capacity, 1) },
    currentLocation: normalizeLocation(vehicle.currentLocation ?? vehicle.location, vehicleId),
    serviceZone: asString(vehicle.serviceZone, "Unassigned"),
    shiftStart: asString(vehicle.shiftStart, ""),
    shiftEnd: asString(vehicle.shiftEnd, ""),
    available,
    plannedStops: [],
    hourlyRate: asNumber(vehicle.hourlyRate),
    wheelchairAccessible: Boolean(vehicle.wheelchairAccessible),
    status: normalizeVehicleStatus(vehicle.status, available),
    driverName: asString(vehicle.driverName, "Unassigned"),
    utilization: asNumber(vehicle.utilization),
  };
}

function normalizeDriver(value: unknown, index: number): Driver {
  const driver = asRecord(value);
  const driverId = asString(driver.driverId ?? driver.id ?? driver.externalId, `driver-${index + 1}`);
  const firstName = asString(driver.firstName, "");
  const lastName = asString(driver.lastName, "");

  return {
    driverId,
    name: asString(driver.name, `${firstName} ${lastName}`.trim() || driverId),
    currentVehicleId: asString(driver.currentVehicleId ?? driver.vehicleId, "Unassigned"),
    currentLocation: normalizeLocation(driver.currentLocation ?? driver.location, driverId),
    status: asString(driver.status, "Off shift") as Driver["status"],
    shift: asString(driver.shift, "Not scheduled"),
    performance: asNumber(driver.performance),
    incidents: asNumber(driver.incidents),
  };
}

function normalizeTrip(value: unknown, index: number): TripRequest {
  const trip = asRecord(value);
  const requestId = asString(trip.requestId ?? trip.id ?? trip.externalId, `trip-${index + 1}`);
  const passenger = asRecord(trip.passenger);

  return {
    requestId,
    passenger: { passengerId: asString(passenger.passengerId ?? trip.passengerId, "unknown"), name: asString(passenger.name, "Passenger"), wheelchairAccessible: Boolean(passenger.wheelchairAccessible), passengerCount: asNumber(passenger.passengerCount, 1) },
    pickupLocation: normalizeLocation(trip.pickupLocation, `${requestId}-pickup`),
    dropoffLocation: normalizeLocation(trip.dropoffLocation, `${requestId}-dropoff`),
    requestedPickupTime: asString(trip.requestedPickupTime, ""),
    requestedDropoffTime: asString(trip.requestedDropoffTime, ""),
    pickupTimeWindow: { start: "", end: "" },
    dropoffTimeWindow: { start: "", end: "" },
    maxWaitMinutes: asNumber(trip.maxWaitMinutes),
    maxRideMinutes: asNumber(trip.maxRideMinutes),
    maxDetourMinutes: asNumber(trip.maxDetourMinutes),
    serviceZone: asString(trip.serviceZone, "Unassigned"),
    wheelchairRequired: Boolean(trip.wheelchairRequired),
    preferredVehicleType: "STANDARD",
    sourceSystem: asString(trip.sourceSystem, "platform"),
    status: asString(trip.status, "Unassigned") as TripRequest["status"],
    eta: asString(trip.eta, "Pending"),
    vehicleId: typeof trip.vehicleId === "string" ? trip.vehicleId : undefined,
  };
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}.`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  endpoints: {
    dashboard: "/api/v1/analytics/dashboard",
    bookings: "/api/v1/bookings",
    drivers: "/api/v1/drivers",
    vehicles: "/api/v1/vehicles",
    optimize: "/api/v1/dispatch/optimize",
    dispatch: "/api/v1/dispatch",
    evaluate: "/api/v1/dispatch/evaluate",
  },
  async getDashboard(): Promise<DashboardSnapshot> {
    if (useMockApi) return fetchDashboardSnapshot();
    const [vehicles, drivers, requests] = await Promise.all([this.getVehicles(), this.getDrivers(), this.getTripRequests()]);
    return { summary: { activeTrips: requests.filter((trip) => trip.status !== "Cancelled").length, availableDrivers: drivers.filter((driver) => driver.status === "Available").length, serviceZones: new Set(vehicles.map((vehicle) => vehicle.serviceZone)).size, unassignedRequests: requests.filter((trip) => trip.status === "Unassigned").length }, vehicles, drivers, requests, alerts: [], serviceZones: [], incidents: [], recommendations: [] };
  },
  async getVehicles(): Promise<Vehicle[]> {
    if (useMockApi) return fetchVehicles();
    const vehicles = await request<unknown[]>(dispatchApiUrl, this.endpoints.vehicles);
    return vehicles.map(normalizeVehicle);
  },
  async getDrivers(): Promise<Driver[]> {
    if (useMockApi) return fetchDrivers();
    const drivers = await request<unknown[]>(platformApiUrl, this.endpoints.drivers);
    return drivers.map(normalizeDriver);
  },
  async getRecommendations(): Promise<DispatchRecommendation[]> {
    return fetchDispatchRecommendations();
  },
  async getTripRequests(): Promise<TripRequest[]> {
    if (useMockApi) {
      const snapshot = await fetchDashboardSnapshot();
      return snapshot.requests;
    }
    const trips = await request<unknown[]>(platformApiUrl, "/api/v1/trips");
    return trips.map(normalizeTrip);
  },
  async reassignTrip(requestId: string, vehicleId: string): Promise<TripRequest> {
    if (useMockApi) return reassignTrip(requestId, vehicleId);
    await request(dispatchApiUrl, "/api/v1/dispatch/assign", { method: "POST", body: JSON.stringify({ requestId, vehicleId }) });
    const trips = await this.getTripRequests();
    return trips.find((trip) => trip.requestId === requestId) ?? normalizeTrip({ requestId, vehicleId, status: "Assigned" }, 0);
  },
  async cancelTrip(requestId: string): Promise<TripRequest> {
    if (useMockApi) return cancelTrip(requestId);
    const result = await request<unknown>(platformApiUrl, `/api/v1/trips/${encodeURIComponent(requestId)}/status`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
    return normalizeTrip(result, 0);
  },
  async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle> {
    if (useMockApi) return updateVehicleStatus(vehicleId, status);
    const result = await request<unknown>(platformApiUrl, `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    return normalizeVehicle(result, 0);
  },
  async updateDriverStatus(driverId: string, status: DriverStatus): Promise<Driver> {
    if (useMockApi) return updateDriverStatus(driverId, status);
    const result = await request<unknown>(platformApiUrl, `/api/v1/drivers/${encodeURIComponent(driverId)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    return normalizeDriver(result, 0);
  },
  async toggleZoneStatus(zoneId: string): Promise<ServiceZone> {
    if (useMockApi) return toggleZoneStatus(zoneId);
    throw new Error("The configured platform API does not define a service-zone status endpoint.");
  },
  async createServiceZone(request: ServiceZoneCreateRequest): Promise<ServiceZone> {
    if (useMockApi) return createServiceZone(request);
    throw new Error("The configured platform API does not define a service-zone creation endpoint.");
  },
  async acknowledgeAlert(alertId: string): Promise<AlertItem> {
    if (useMockApi) return acknowledgeAlert(alertId);
    throw new Error("The configured platform API does not define an alert acknowledgement endpoint.");
  },
  async createSupportTicket(ticket: SupportTicketRequest): Promise<SupportTicket> {
    if (useMockApi) return createSupportTicket(ticket);
    const result = await request<unknown>(platformApiUrl, "/api/v1/support/tickets", { method: "POST", body: JSON.stringify(ticket) });
    const value = asRecord(result);
    return { id: asString(value.id, "submitted"), subject: ticket.subject, description: ticket.description, priority: ticket.priority, status: "open", createdAt: new Date().toISOString() };
  },
  async createTripRequest(input: TripRequestCreateInput): Promise<TripRequest> {
    if (useMockApi) return createTripRequest(input);
    const payload = {
      requestId: crypto.randomUUID(),
      passenger: { passengerId: crypto.randomUUID(), name: input.passengerName, wheelchairAccessible: input.wheelchairRequired, passengerCount: input.passengerCount },
      pickupLocation: { id: crypto.randomUUID(), latitude: 0, longitude: 0, zone: input.pickupZone },
      dropoffLocation: { id: crypto.randomUUID(), latitude: 0, longitude: 0, zone: input.dropoffZone },
      requestedPickupTime: input.requestedPickupTime,
      requestedDropoffTime: input.requestedPickupTime,
      pickupTimeWindow: { start: input.requestedPickupTime, end: input.requestedPickupTime },
      dropoffTimeWindow: { start: input.requestedPickupTime, end: input.requestedPickupTime },
      maxWaitMinutes: 15, maxRideMinutes: 45, maxDetourMinutes: 10, serviceZone: input.pickupZone,
      wheelchairRequired: input.wheelchairRequired, preferredVehicleType: input.wheelchairRequired ? "WHEELCHAIR_ACCESSIBLE" : "STANDARD", sourceSystem: "operator-web",
    };
    const result = await request<unknown>(dispatchApiUrl, "/api/v1/dispatch", { method: "POST", body: JSON.stringify(payload) });
    return normalizeTrip(result, 0);
  },
  async getDispatchConfiguration(): Promise<DispatchConfiguration> {
    if (useMockApi) return fetchDispatchConfiguration();
    throw new Error("The configured platform API does not define a dispatch configuration endpoint.");
  },
  async updateDispatchConfiguration(configuration: DispatchConfiguration): Promise<DispatchConfiguration> {
    if (useMockApi) return updateDispatchConfiguration(configuration);
    throw new Error("The configured platform API does not define a dispatch configuration endpoint.");
  },
};
