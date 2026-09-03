"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@/lib/api";
import { useOpsStore } from "@/lib/store";
import type { SupportTicketRequest } from "@/lib/types";

const schema = z.object({ subject: z.string().trim().min(4, "Enter a concise subject."), description: z.string().trim().min(10, "Provide enough detail for operations support."), priority: z.enum(["low", "medium", "high", "critical"]) });

export function SupportTicketForm() {
  const selectedRole = useOpsStore((state) => state.selectedRole);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupportTicketRequest>({ resolver: zodResolver(schema), defaultValues: { priority: "medium" } });
  const mutation = useMutation({ mutationFn: api.createSupportTicket, onSuccess: (ticket) => { setMessage(`${ticket.id} created.`); reset({ priority: "medium" }); }, onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create ticket.") });
  const canCreateTicket = ["Support Agent", "Operations Manager", "Administrator", "Super Administrator"].includes(selectedRole);

  return <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4"><h2 className="mb-3 font-medium text-white">Create support ticket</h2><div className="space-y-3"><label className="block"><span className="mb-1 block text-xs text-slate-400">Subject</span><input {...register("subject")} disabled={!canCreateTicket} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm disabled:opacity-60" />{errors.subject && <span className="text-xs text-rose-300">{errors.subject.message}</span>}</label><label className="block"><span className="mb-1 block text-xs text-slate-400">Description</span><textarea {...register("description")} disabled={!canCreateTicket} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm disabled:opacity-60" />{errors.description && <span className="text-xs text-rose-300">{errors.description.message}</span>}</label><label className="block"><span className="mb-1 block text-xs text-slate-400">Priority</span><select {...register("priority")} disabled={!canCreateTicket} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm disabled:opacity-60"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div><button type="submit" disabled={!canCreateTicket || mutation.isPending} className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"><Send size={15} />{mutation.isPending ? "Creating..." : "Create ticket"}</button>{message && <p className="mt-2 text-sm text-cyan-200">{message}</p>}</form>;
}