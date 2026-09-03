"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, MapPin, Users } from "lucide-react";

import { OperationsNav } from "@/components/operations-nav";
import { ConfigurationForm } from "@/components/configuration-form";
import { ZoneCreationForm } from "@/components/zone-creation-form";
import { SupportTicketForm } from "@/components/support-ticket-form";
import { TripRequestForm } from "@/components/trip-request-form";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useOpsStore } from "@/lib/store";
import type { DriverStatus, VehicleStatus } from "@/lib/types";

type WorkspaceKind = "trips" | "fleet" | "drivers" | "zones" | "analytics" | "configuration" | "administration";

const details: Record<WorkspaceKind, { title: string; summary: string }> = {
  trips: { title: "Trip management", summary: "Monitor requests, passenger journeys, pickup windows, and dispatch outcomes." },
  fleet: { title: "Fleet operations", summary: "Manage vehicle availability, capacity, maintenance, and utilization." },
  drivers: { title: "Driver operations", summary: "Review driver shifts, location, vehicle assignment, and performance." },
  zones: { title: "Service zones", summary: "Operate zones, service hours, and pickup and drop-off points." },
  analytics: { title: "Network analytics", summary: "Track service quality, demand, fleet utilization, and exceptions." },
  configuration: { title: "Dispatch configuration", summary: "Set dispatch constraints and service operating rules." },
  administration: { title: "Administration", summary: "Manage access, roles, and support operations." },
};

export function WorkspaceLayout({ kind }: { kind: WorkspaceKind }) {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard, staleTime: 15_000 });
  const page = details[kind];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">Mawsel DRT</p>
            <h1 className="text-2xl font-semibold text-white">{page.title}</h1>
          </div>
          <span className="flex items-center gap-2 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Network online</span>
        </div>
      </header>
      <OperationsNav />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <p className="text-slate-400">{page.summary}</p>
        {isLoading || !data ? <p className="text-sm text-slate-400">Loading operations data...</p> : <WorkspaceContent kind={kind} data={data} />}
      </main>
    </div>
  );
}

function WorkspaceContent({ kind, data }: { kind: WorkspaceKind; data: Awaited<ReturnType<typeof api.getDashboard>> }) {
  const queryClient = useQueryClient();
  const selectedRole = useOpsStore((state) => state.selectedRole);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  const vehicleMutation = useMutation({ mutationFn: ({ vehicleId, status }: { vehicleId: string; status: VehicleStatus }) => api.updateVehicleStatus(vehicleId, status), onSuccess: refresh });
  const driverMutation = useMutation({ mutationFn: ({ driverId, status }: { driverId: string; status: DriverStatus }) => api.updateDriverStatus(driverId, status), onSuccess: refresh });
  const zoneMutation = useMutation({ mutationFn: api.toggleZoneStatus, onSuccess: refresh });

  if (kind === "trips") {
    return <section><TripRequestForm /><div className="overflow-hidden rounded-xl border border-slate-800"><table className="min-w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Passenger</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Pickup ETA</th></tr></thead><tbody>{data.requests.map((trip) => <tr key={trip.requestId} className="border-t border-slate-800 bg-slate-950"><td className="px-4 py-3">{trip.requestId}</td><td className="px-4 py-3">{trip.passenger.name}</td><td className="px-4 py-3">{trip.status}</td><td className="px-4 py-3">{trip.vehicleId ?? "Unassigned"}</td><td className="px-4 py-3">{trip.eta}</td></tr>)}</tbody></table></div></section>;
  }

  if (kind === "fleet") {
    return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.vehicles.map((vehicle) => <div key={vehicle.vehicleId} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex justify-between"><h2 className="font-medium text-white">{vehicle.vehicleId}</h2><span className="text-xs text-cyan-300">{vehicle.status}</span></div><p className="mt-2 text-sm text-slate-400">{vehicle.type} · {vehicle.serviceZone}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Driver</dt><dd>{vehicle.driverName}</dd></div><div><dt className="text-slate-500">Capacity</dt><dd>{vehicle.capacity.maxPassengers} seats</dd></div><div><dt className="text-slate-500">Utilization</dt><dd>{vehicle.utilization}%</dd></div><div><dt className="text-slate-500">Accessibility</dt><dd>{vehicle.wheelchairAccessible ? "Ready" : "Standard"}</dd></div></dl><select aria-label={`Status for ${vehicle.vehicleId}`} value={vehicle.status} disabled={!hasPermission(selectedRole, "fleet:write") || vehicleMutation.isPending} onChange={(event) => vehicleMutation.mutate({ vehicleId: vehicle.vehicleId, status: event.target.value as VehicleStatus })} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm disabled:opacity-60"><option>Available</option><option>Assigned</option><option>En route</option><option>Boarding</option><option>In trip</option><option>Break</option><option>Maintenance</option><option>Offline</option><option>Emergency</option></select></div>)}</section>;
  }

  if (kind === "drivers") {
    return <section className="grid gap-4 md:grid-cols-2">{data.drivers.map((driver) => <div key={driver.driverId} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center justify-between"><div><h2 className="font-medium text-white">{driver.name}</h2><p className="text-sm text-slate-400">{driver.driverId} · {driver.currentVehicleId}</p></div><span className="text-sm text-cyan-300">{driver.status}</span></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-slate-500">Shift</p><p>{driver.shift}</p></div><div><p className="text-slate-500">Performance</p><p>{driver.performance}%</p></div><div><p className="text-slate-500">Incidents</p><p>{driver.incidents}</p></div></div><select aria-label={`Status for ${driver.name}`} value={driver.status} disabled={!hasPermission(selectedRole, "fleet:write") || driverMutation.isPending} onChange={(event) => driverMutation.mutate({ driverId: driver.driverId, status: event.target.value as DriverStatus })} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm disabled:opacity-60"><option>Off shift</option><option>Available</option><option>Assigned</option><option>Driving</option><option>Break</option><option>Emergency</option></select></div>)}</section>;
  }

  if (kind === "zones") {
    return <section className="space-y-4"><ZoneCreationForm /><div className="grid gap-4 md:grid-cols-2">{data.serviceZones.map((zone) => <div key={zone.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center justify-between"><h2 className="font-medium text-white">{zone.name}</h2><span className={zone.status === "active" ? "text-emerald-300" : "text-amber-300"}>{zone.status}</span></div><p className="mt-2 text-sm text-slate-400">{zone.coverage} · {zone.operatingHours}</p><div className="mt-4 flex gap-6 text-sm"><span><MapPin size={14} className="mr-1 inline text-cyan-300" />{zone.pickups} pickups</span><span>{zone.dropoffs} drop-offs</span></div><button type="button" onClick={() => zoneMutation.mutate(zone.id)} disabled={!hasPermission(selectedRole, "zones:write") || zoneMutation.isPending} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{zone.status === "active" ? "Pause zone" : "Enable zone"}</button></div>)}</div></section>;
  }

  if (kind === "analytics") {
    const analytics = [{ label: "Trips today", value: "186", icon: Users }, { label: "Average wait", value: "8.4 min", icon: Clock3 }, { label: "P95 wait", value: "14.8 min", icon: AlertTriangle }, { label: "Vehicle utilization", value: "72%", icon: CheckCircle2 }];
    return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{analytics.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><Icon className="text-cyan-300" size={18} /><p className="mt-6 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>)}</section>;
  }

  if (kind === "configuration") {
    return <ConfigurationForm />;
  }

  return <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><h2 className="font-medium text-white">Role management</h2><p className="mt-2 text-sm text-slate-400">Dispatcher, Fleet Manager, Operations Manager, Support Agent, Administrator, and Super Administrator roles are available for backend-enforced access control.</p></div><div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><h2 className="font-medium text-white">Support operations</h2><p className="mt-2 text-sm text-slate-400">Use passenger, trip, driver, and incident context to create auditable support workflows.</p><SupportTicketForm /></div></section>;
}