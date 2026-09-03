export type VehicleType =
  | "STANDARD"
  | "WHEELCHAIR_ACCESSIBLE"
  | "MINIBUS"
  | "SHUTTLE"
  | "VIP";

export type VehicleStatus =
  | "Offline"
  | "Available"
  | "Assigned"
  | "En route"
  | "Boarding"
  | "In trip"
  | "Break"
  | "Maintenance"
  | "Emergency";

export type DriverStatus =
  | "Off shift"
  | "Available"
  | "Assigned"
  | "Driving"
  | "Break"
  | "Emergency";

export type UserRole =
  | "Dispatcher"
  | "Fleet Manager"
  | "Operations Manager"
  | "Support Agent"
  | "Administrator"
  | "Super Administrator";

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  zone: string;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface Passenger {
  passengerId: string;
  name: string;
  wheelchairAccessible: boolean;
  passengerCount: number;
}

export interface VehicleCapacity {
  seats: number;
  wheelchairs: number;
  maxPassengers: number;
}

export interface TripStop {
  stopId: string;
  passengerId: string;
  type: "PICKUP" | "DROP_OFF";
  location: Location;
  plannedArrivalTime?: string | null;
  plannedDepartureTime?: string | null;
  serviceDurationMinutes: number;
  timeWindow: TimeWindow;
}

export interface Vehicle {
  vehicleId: string;
  operatorId: string;
  type: VehicleType;
  capacity: VehicleCapacity;
  currentLocation: Location;
  serviceZone: string;
  shiftStart: string;
  shiftEnd: string;
  available: boolean;
  plannedStops: TripStop[];
  hourlyRate: number;
  wheelchairAccessible: boolean;
  status: VehicleStatus;
  driverName: string;
  utilization: number;
}

export interface Driver {
  driverId: string;
  name: string;
  currentVehicleId: string;
  currentLocation: Location;
  status: DriverStatus;
  shift: string;
  performance: number;
  incidents: number;
}

export interface TripRequest {
  requestId: string;
  passenger: Passenger;
  pickupLocation: Location;
  dropoffLocation: Location;
  requestedPickupTime: string;
  requestedDropoffTime: string;
  pickupTimeWindow: TimeWindow;
  dropoffTimeWindow: TimeWindow;
  maxWaitMinutes: number;
  maxRideMinutes: number;
  maxDetourMinutes: number;
  serviceZone: string;
  wheelchairRequired: boolean;
  preferredVehicleType: VehicleType;
  sourceSystem: string;
  status: "Unassigned" | "Assigned" | "Boarding" | "In Trip" | "Cancelled";
  eta: string;
  vehicleId?: string;
}

export interface TripRequestCreateInput {
  passengerName: string;
  passengerCount: number;
  pickupZone: string;
  dropoffZone: string;
  requestedPickupTime: string;
  wheelchairRequired: boolean;
}

export interface ServiceZone {
  id: string;
  name: string;
  status: "active" | "paused";
  coverage: string;
  operatingHours: string;
  pickups: number;
  dropoffs: number;
}

export interface ServiceZoneCreateRequest {
  name: string;
  coverage: string;
  operatingHours: string;
}

export interface SupportTicketRequest {
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface SupportTicket extends SupportTicketRequest {
  id: string;
  status: "open";
  createdAt: string;
}

export interface AlertItem {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  assetType: "Vehicle" | "Driver" | "Trip" | "System";
  assetId: string;
  occurredAt: string;
  status: "open" | "acknowledged";
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: AlertItem["severity"];
  status: "open" | "acknowledged" | "resolved";
}

export interface DispatchRecommendation {
  id: string;
  requestId: string;
  vehicleId: string;
  score: number;
  etaMinutes: number;
  status: "recommended" | "manual-review";
  reason: string;
}

export interface DispatchConfiguration {
  maxWaitMinutes: number;
  maxWalkingDistanceMeters: number;
  maxDetourMinutes: number;
  maxRideMinutes: number;
  defaultVehicleCapacity: number;
  serviceHours: string;
  dispatchRule: "Priority queue" | "Balanced utilization" | "Shortest ETA";
}

export interface DashboardSnapshot {
  summary: {
    activeTrips: number;
    availableDrivers: number;
    serviceZones: number;
    unassignedRequests: number;
  };
  vehicles: Vehicle[];
  drivers: Driver[];
  requests: TripRequest[];
  alerts: AlertItem[];
  serviceZones: ServiceZone[];
  incidents: Incident[];
  recommendations: DispatchRecommendation[];
}

export interface RealtimeEvent {
  type: "trip" | "vehicle" | "alert" | "driver" | "dispatch";
  message: string;
  severity: AlertItem["severity"];
  timestamp: string;
}
