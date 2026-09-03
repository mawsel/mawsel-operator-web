"use client";

import { BarChart3, BusFront, Map, Route, Settings, Shield, Users, Waypoints } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Network", icon: Map },
  { href: "/trips", label: "Trips", icon: Route },
  { href: "/fleet", label: "Fleet", icon: BusFront },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/zones", label: "Zones", icon: Waypoints },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/configuration", label: "Configuration", icon: Settings },
  { href: "/administration", label: "Administration", icon: Shield },
];

export function OperationsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Operations navigation" className="border-b border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 py-2">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}