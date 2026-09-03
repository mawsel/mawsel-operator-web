"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useOpsStore } from "@/lib/store";
import type { TripRequestCreateInput } from "@/lib/types";

const schema = z.object({ passengerName: z.string().trim().min(2, "Enter the passenger name."), passengerCount: z.coerce.number().int().min(1).max(12), pickupZone: z.string().trim().min(2, "Enter a pickup zone."), dropoffZone: z.string().trim().min(2, "Enter a drop-off zone."), requestedPickupTime: z.string().min(1, "Select a pickup time."), wheelchairRequired: z.boolean() });
type TripFormInput = z.input<typeof schema>;
type TripFormValues = z.output<typeof schema>;

export function TripRequestForm() {
  const selectedRole = useOpsStore((state) => state.selectedRole);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TripFormInput, undefined, TripFormValues>({ resolver: zodResolver(schema), defaultValues: { passengerCount: 1, wheelchairRequired: false } });
  const mutation = useMutation({ mutationFn: (values: TripRequestCreateInput) => api.createTripRequest(values), onSuccess: (trip) => { setMessage(`${trip.requestId} created and queued for dispatch.`); reset({ passengerCount: 1, wheelchairRequired: false }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); }, onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create trip request.") });
  const canDispatch = hasPermission(selectedRole, "dispatch:write");

  return <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="mb-3 flex items-center gap-2"><Plus size={18} className="text-cyan-300" /><h2 className="font-medium text-white">New trip request</h2></div><div className="grid gap-3 md:grid-cols-3"><label><span className="mb-1 block text-xs text-slate-400">Passenger</span><input {...register("passengerName")} disabled={!canDispatch} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" />{errors.passengerName && <span className="text-xs text-rose-300">{errors.passengerName.message}</span>}</label><label><span className="mb-1 block text-xs text-slate-400">Passengers</span><input {...register("passengerCount")} type="number" disabled={!canDispatch} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" /></label><label><span className="mb-1 block text-xs text-slate-400">Pickup time</span><input {...register("requestedPickupTime")} type="datetime-local" disabled={!canDispatch} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" /></label><label><span className="mb-1 block text-xs text-slate-400">Pickup zone</span><input {...register("pickupZone")} disabled={!canDispatch} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" /></label><label><span className="mb-1 block text-xs text-slate-400">Drop-off zone</span><input {...register("dropoffZone")} disabled={!canDispatch} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" /></label><label className="flex items-end gap-2 pb-2 text-sm"><input {...register("wheelchairRequired")} type="checkbox" disabled={!canDispatch} /> Wheelchair required</label></div><button type="submit" disabled={!canDispatch || mutation.isPending} className="mt-4 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60">{mutation.isPending ? "Submitting..." : "Queue request"}</button>{message && <p className="mt-2 text-sm text-cyan-200">{message}</p>}</form>;
}