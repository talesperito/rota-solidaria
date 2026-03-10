"use client";

import { useEffect, useRef } from "react";

interface HubMapPin {
    id: string;
    name: string;
    address: string;
    gps_lat: number;
    gps_lng: number;
    status: string;
}

interface HubsMapProps {
    hubs: HubMapPin[];
}

export default function HubsMap({ hubs }: HubsMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current || hubs.length === 0) return;

        // Lazily import leaflet to avoid SSR issues
        import("leaflet").then((L) => {
            // Fix default icon paths broken by webpack
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            // Destroy previous instance to avoid duplicate maps on re-render
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const validHubs = hubs.filter((h) => h.gps_lat && h.gps_lng);
            if (validHubs.length === 0) return;

            const center: [number, number] = [
                validHubs.reduce((s, h) => s + h.gps_lat, 0) / validHubs.length,
                validHubs.reduce((s, h) => s + h.gps_lng, 0) / validHubs.length,
            ];

            const map = L.map(mapRef.current!, { scrollWheelZoom: false });
            mapInstanceRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18,
            }).addTo(map);

            const activeIcon = new L.Icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            });

            const inactiveIcon = new L.Icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [20, 33],
                iconAnchor: [10, 33],
                popupAnchor: [1, -28],
                className: "hub-marker-inactive",
            });

            validHubs.forEach((hub) => {
                const icon = hub.status === "active" ? activeIcon : inactiveIcon;
                L.marker([hub.gps_lat, hub.gps_lng], { icon })
                    .addTo(map)
                    .bindPopup(
                        `<strong>${hub.name}</strong><br/>` +
                        `<small>${hub.address}</small><br/>` +
                        `<span style="font-size:0.75rem;color:${hub.status === "active" ? "#10b981" : "#6b7280"}">${hub.status === "active" ? "● Ativo" : "○ Inativo"}</span>`
                    );
            });

            if (validHubs.length === 1) {
                map.setView(center, 14);
            } else {
                const bounds = L.latLngBounds(validHubs.map((h) => [h.gps_lat, h.gps_lng]));
                map.fitBounds(bounds, { padding: [40, 40] });
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hubs]);

    const hubsWithCoords = hubs.filter((h) => h.gps_lat && h.gps_lng);
    if (hubsWithCoords.length === 0) return null;

    return (
        <div style={{ marginTop: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                📍 {hubsWithCoords.length} ponto{hubsWithCoords.length !== 1 ? "s" : ""} com coordenadas GPS
            </p>
            <div
                ref={mapRef}
                style={{
                    height: 300,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--color-border)",
                    overflow: "hidden",
                }}
            />
            {/* Leaflet CSS */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                crossOrigin=""
            />
        </div>
    );
}
