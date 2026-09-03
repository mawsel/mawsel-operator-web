"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useOpsStore } from "@/lib/store";

const configurationSchema = z.object({
  maxWaitMinutes: z.coerce.number().int().min(1).max(120),
  maxWalkingDistanceMeters: z.coerce.number().int().min(0).max(5000),
  maxDetourMinutes: z.coerce.number().int().min(0).max(120),
  maxRideMinutes: z.coerce.number().int().min(1).max(240),
  defaultVehicleCapacity: z.coerce.number().int().min(1).max(100),
  serviceHours: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, "Use HH:MM - HH:MM"),
  dispatchRule: z.enum(["Priority queue", "Balanced utilization", "Shortest ETA"]),
});

type ConfigurationFormInput = z.input<typeof configurationSchema>;
type ConfigurationFormValues = z.output<typeof configurationSchema>;

export function ConfigurationForm() {
  const selectedRole = useOpsStore((state) => state.selectedRole);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["dispatch-configuration"], queryFn: api.getDispatchConfiguration });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConfigurationFormInput, undefined, ConfigurationFormValues>({ resolver: zodResolver(configurationSchema) });
  const mutation = useMutation({
    mutationFn: api.updateDispatchConfiguration,
    onSuccess: () => {
      setMessage("Dispatch configuration saved.");
      void queryClient.invalidateQueries({ queryKey: ["dispatch-configuration"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to save configuration."),
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  if (isLoading) return <p className="text-sm text-slate-400">Loading dispatch configuration...</p>;

  const canEdit = hasPermission(selectedRole, "configuration:write");
  const fields: Array<{ key: keyof ConfigurationFormValues; label: string; type?: "number" | "text" }> = [
    { key: "maxWaitMinutes", label: "Maximum wait time (minutes)", type: "number" },
    { key: "maxWalkingDistanceMeters", label: "Maximum walking distance (meters)", type: "number" },
    { key: "maxDetourMinutes", label: "Maximum detour (minutes)", type: "number" },
    { key: "maxRideMinutes", label: "Maximum ride duration (minutes)", type: "number" },
    { key: "defaultVehicleCapacity", label: "Default vehicle capacity", type: "number" },
    { key: "serviceHours", label: "Service hours", type: "text" },
  ];

  return <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="max-w-2xl space-y-4">
    {fields.map(({ key, label, type = "text" }) => <label key={key} className="block rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="mb-2 block text-sm text-slate-300">{label}</span><input {...register(key)} type={type} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" />{errors[key] && <span className="mt-1 block text-xs text-rose-300">{errors[key]?.message}</span>}</label>)}
    <label className="block rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="mb-2 block text-sm text-slate-300">Dispatch rule</span><select {...register("dispatchRule")} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60"><option>Priority queue</option><option>Balanced utilization</option><option>Shortest ETA</option></select></label>
    <button type="submit" disabled={!canEdit || mutation.isPending} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{mutation.isPending ? "Saving..." : "Save configuration"}</button>
    {!canEdit && <p className="text-xs text-amber-200">Your current role cannot update dispatch configuration.</p>}
    {message && <p className="text-sm text-cyan-200">{message}</p>}
  </form>;
}