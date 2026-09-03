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
import type { ServiceZoneCreateRequest } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a zone name."),
  coverage: z.string().trim().min(2, "Describe the zone coverage."),
  operatingHours: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, "Use HH:MM - HH:MM."),
});

export function ZoneCreationForm() {
  const selectedRole = useOpsStore((state) => state.selectedRole);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceZoneCreateRequest>({ resolver: zodResolver(schema), defaultValues: { operatingHours: "06:00 - 22:00" } });
  const mutation = useMutation({
    mutationFn: api.createServiceZone,
    onSuccess: (zone) => {
      setMessage(`${zone.name} is active.`);
      reset({ operatingHours: "06:00 - 22:00" });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create zone."),
  });
  const canEdit = hasPermission(selectedRole, "zones:write");

  return <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <div className="mb-3 flex items-center gap-2"><Plus size={18} className="text-cyan-300" /><h2 className="font-medium text-white">Create service zone</h2></div>
    <div className="grid gap-3 md:grid-cols-3"><label><span className="mb-1 block text-xs text-slate-400">Name</span><input {...register("name")} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" />{errors.name && <span className="text-xs text-rose-300">{errors.name.message}</span>}</label><label><span className="mb-1 block text-xs text-slate-400">Coverage</span><input {...register("coverage")} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" />{errors.coverage && <span className="text-xs text-rose-300">{errors.coverage.message}</span>}</label><label><span className="mb-1 block text-xs text-slate-400">Operating hours</span><input {...register("operatingHours")} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60" />{errors.operatingHours && <span className="text-xs text-rose-300">{errors.operatingHours.message}</span>}</label></div>
    <button type="submit" disabled={!canEdit || mutation.isPending} className="mt-4 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{mutation.isPending ? "Creating..." : "Create zone"}</button>
    {message && <p className="mt-2 text-sm text-cyan-200">{message}</p>}
  </form>;
}