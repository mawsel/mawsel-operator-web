"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, MapPinned, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { LiveMap } from "@/components/live-map";
import { OperationsNav } from "@/components/operations-nav";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { subscribeToRealtime } from "@/lib/realtime";
import { useOpsStore } from "@/lib/store";
import type { RealtimeEvent, UserRole } from "@/lib/types";

const roleOptions: UserRole[] = [
  "Dispatcher",
  "Fleet Manager",
  "Operations Manager",
  "Support Agent",
  "Administrator",
  "Super Administrator",
];

const reassignSchema = z.object({
  tripId: z.string().min(1, "Trip is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
});

export function OperationsDashboard() {
  const { selectedRole, setSelectedRole, setSelectedVehicleId, mapFilter, setMapFilter } = useOpsStore();
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    staleTime: 15_000,
  });
  const reassignMutation = useMutation({
    mutationFn: ({ tripId, vehicleId }: z.infer<typeof reassignSchema>) => api.reassignTrip(tripId, vehicleId),
    onSuccess: (trip) => {
      setSelectedVehicleId(trip.vehicleId ?? null);
      setDispatchMessage(`${trip.requestId} assigned to ${trip.vehicleId}.`);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (mutationError) => {
      setDispatchMessage(mutationError instanceof Error ? mutationError.message : "Trip reassignment failed.");
    },
  });
  const cancelMutation = useMutation({
    mutationFn: api.cancelTrip,
    onSuccess: (trip) => {
      setDispatchMessage(`${trip.requestId} has been cancelled.`);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (mutationError) => {
      setDispatchMessage(mutationError instanceof Error ? mutationError.message : "Trip cancellation failed.");
    },
  });
  const acknowledgeAlertMutation = useMutation({
    mutationFn: api.acknowledgeAlert,
    onSuccess: (alert) => {
      setDispatchMessage(`${alert.title} alert acknowledged.`);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (mutationError) => {
      setDispatchMessage(mutationError instanceof Error ? mutationError.message : "Alert acknowledgement failed.");
    },
  });

  useEffect(() => {
    return subscribeToRealtime((event) => {
      setRealtimeEvents((currentEvents) => [event, ...currentEvents].slice(0, 3));
    });
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof reassignSchema>>({
    resolver: zodResolver(reassignSchema),
    defaultValues: {
      tripId: "req-4401",
      vehicleId: "veh-201",
    },
  });

  const onSubmit = (values: z.infer<typeof reassignSchema>) => {
    setDispatchMessage(null);
    reassignMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-4 text-sm text-slate-300">
          Loading live operations...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          Unable to load operations dashboard.
        </div>
      </div>
    );
  }

  const { summary, vehicles, drivers, requests, alerts, serviceZones, incidents, recommendations } = data;
  const canDispatch = hasPermission(selectedRole, "dispatch:write");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">Mawsel DRT</p>
            <h1 className="text-2xl font-semibold text-white">LIVE OPERATIONS MAP</h1>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300">Role</label>
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as UserRole)}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>
      <OperationsNav />

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active trips", value: summary.activeTrips, icon: Activity },
            { label: "Available drivers", value: summary.availableDrivers, icon: Users },
            { label: "Unassigned requests", value: summary.unassignedRequests, icon: AlertTriangle },
            { label: "Service zones", value: summary.serviceZones, icon: MapPinned },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg shadow-slate-950/30">
              <div className="mb-4 flex items-center justify-between text-slate-300">
                <span className="text-sm">{label}</span>
                <Icon size={18} className="text-cyan-400" />
              </div>
              <div className="text-3xl font-semibold text-white">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations view</p>
                <h2 className="text-lg font-semibold text-white">Network map</h2>
              </div>
              <div className="flex gap-2 text-xs">
                {(["all", "alerts", "service"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setMapFilter(filter)}
                    className={`rounded-full border border-slate-700 px-2 py-1 capitalize ${mapFilter === filter ? "bg-slate-800 text-slate-200" : "text-slate-400"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <LiveMap vehicles={vehicles} alerts={alerts} filter={mapFilter} />
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Dispatch actions</h3>
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-400">Trip</label>
                  <input
                    {...register("tripId")}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                  {errors.tripId && <p className="mt-1 text-xs text-red-300">{errors.tripId.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-400">Vehicle</label>
                  <select
                    {...register("vehicleId")}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                        {vehicle.vehicleId} · {vehicle.status}
                      </option>
                    ))}
                  </select>
                  {errors.vehicleId && <p className="mt-1 text-xs text-red-300">{errors.vehicleId.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={reassignMutation.isPending || !canDispatch}
                  className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reassignMutation.isPending ? "Reassigning..." : "Reassign vehicle"}
                </button>
                {!canDispatch && <p className="text-xs text-amber-200">Your current role cannot change dispatch assignments.</p>}
                {dispatchMessage && <p className="text-xs text-cyan-200">{dispatchMessage}</p>}
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <h3 className="mb-3 text-lg font-medium text-white">Alerts</h3>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{alert.title}</span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-amber-300">{alert.severity}</span>
                    </div>
                    <p className="text-xs text-slate-400">{alert.description}</p>
                    {alert.status === "open" ? (
                      <button
                        type="button"
                        onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                        disabled={!canDispatch || acknowledgeAlertMutation.isPending}
                        className="mt-2 text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-300">Acknowledged</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="mb-3 text-lg font-medium text-white">Active trips</h3>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.requestId} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-white">{request.passenger.name}</span>
                      <div className="text-[11px] text-slate-400">{request.requestId}</div>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-300">{request.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>Pickup: {request.eta}</div>
                    <div>Driver: {request.vehicleId ?? "Unassigned"}</div>
                    <div>Zone: {request.serviceZone}</div>
                    <div>Wait: {request.maxWaitMinutes} min</div>
                  </div>
                  {request.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(request.requestId)}
                      disabled={cancelMutation.isPending || !canDispatch}
                      className="mt-3 text-xs font-medium text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel trip
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="mb-3 text-lg font-medium text-white">Dispatch recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{recommendation.requestId}</span>
                    <span className="text-xs text-cyan-300">Score {recommendation.score}</span>
                  </div>
                  <div className="text-xs text-slate-300">Vehicle {recommendation.vehicleId}</div>
                  <div className="mt-2 text-xs text-slate-400">{recommendation.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="mb-3 text-lg font-medium text-white">Fleet overview</h3>
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-950 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Driver</th>
                    <th className="px-3 py-2">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.vehicleId} className="border-t border-slate-800 bg-slate-900/60">
                      <td className="px-3 py-3">{vehicle.vehicleId}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">{vehicle.driverName}</td>
                      <td className="px-3 py-3">{vehicle.utilization}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <h3 className="mb-3 text-lg font-medium text-white">Service zones</h3>
              <div className="space-y-3">
                {serviceZones.map((zone) => (
                  <div key={zone.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-white">{zone.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-emerald-300">{zone.status}</span>
                    </div>
                    <div className="text-xs text-slate-400">{zone.coverage} · {zone.operatingHours}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <h3 className="mb-3 text-lg font-medium text-white">Incidents</h3>
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div key={incident.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{incident.title}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-rose-300">{incident.severity}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{incident.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="mb-3 text-lg font-medium text-white">Driver roster</h3>
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div key={driver.driverId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div>
                    <div className="font-medium text-white">{driver.name}</div>
                    <div className="text-xs text-slate-400">Shift {driver.shift}</div>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>{driver.status}</div>
                    <div className="text-cyan-300">{driver.performance}% performance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="mb-3 text-lg font-medium text-white">Configuration</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"><span>Maximum wait time</span><span>15 min</span></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"><span>Maximum walk distance</span><span>450 m</span></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"><span>Maximum detour</span><span>10 min</span></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"><span>Vehicle capacity</span><span>4 passengers</span></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"><span>Dispatch rules</span><span>Priority queue</span></div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Live network events</h3>
            <span className="flex items-center gap-2 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Connected
            </span>
          </div>
          {realtimeEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Waiting for mock WebSocket events...</p>
          ) : (
            <div className="space-y-2">
              {realtimeEvents.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2 text-sm">
                  <span className="text-slate-200">{event.message}</span>
                  <span className="ml-4 whitespace-nowrap text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
