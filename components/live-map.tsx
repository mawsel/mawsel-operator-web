"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { AlertItem, Vehicle } from "@/lib/types";

interface LiveMapProps {
  vehicles: Vehicle[];
  alerts: AlertItem[];
  filter: "all" | "alerts" | "service";
}

export function LiveMap({ vehicles, alerts, filter }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let map: MapLibreMap | null = null;

    import("maplibre-gl").then(({ Map, Marker, Popup }) => {
      if (!mapContainer.current || mapRef.current) return;

      map = new Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-74.006, 40.7128],
      zoom: 11,
      });

      const currentMap = map;
      mapRef.current = currentMap;

      currentMap.on("load", () => {
        if (filter !== "alerts") vehicles.forEach((vehicle) => {
          const marker = new Marker({
          color:
            vehicle.status === "Available"
              ? "#22c55e"
              : vehicle.status === "Emergency"
                ? "#ef4444"
                : vehicle.status === "Maintenance"
                  ? "#f59e0b"
                  : "#3b82f6",
        })
          .setLngLat([vehicle.currentLocation.longitude, vehicle.currentLocation.latitude])
            .setPopup(
              new Popup({ offset: 18 }).setHTML(`
              <div style="font-family: sans-serif;">
                <strong>${vehicle.vehicleId}</strong><br />
                ${vehicle.status}<br />
                Driver: ${vehicle.driverName}
              </div>
            `),
              )
              .addTo(currentMap);

          marker.getElement().title = `${vehicle.vehicleId} ${vehicle.status}`;
        });

        if (filter !== "service") alerts.forEach((alert) => {
          const focusPoint = new Marker({
          color: alert.severity === "critical" ? "#ef4444" : alert.severity === "high" ? "#f97316" : "#facc15",
        })
            .setLngLat([-74.006, 40.7128])
            .addTo(currentMap);

          focusPoint.getElement().title = alert.title;
        });
      });
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [alerts, filter, vehicles]);

  return <div ref={mapContainer} className="h-[440px] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950" />;
}
