import { useEffect, useRef } from "react";
import L from "leaflet";

import { findCityCoords, interpolateTripPosition } from "@/fixtures/appData";
import type { Language, TripViewModel } from "@/types/domain";

type Props = {
  trips: TripViewModel[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  lang: Language;
};

export function LiveMap({ trips, selectedTripId, onSelectTrip, lang }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [49.0, 31.0],
      zoom: 6,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    trips.forEach((trip) => {
      const fallbackFrom = findCityCoords(trip.from);
      const fallbackTo = findCityCoords(trip.to);
      const position =
        trip.lat != null && trip.lng != null
          ? { lat: trip.lat, lng: trip.lng }
          : interpolateTripPosition(trip.from, trip.to, trip.progress);
      const lat = position?.lat ?? fallbackFrom?.lat ?? 49.0;
      const lng = position?.lng ?? fallbackFrom?.lng ?? 31.0;

      if (fallbackFrom && fallbackTo) {
        L.polyline(
          [
            [fallbackFrom.lat, fallbackFrom.lng],
            [fallbackTo.lat, fallbackTo.lng],
          ],
          {
            color: selectedTripId === trip.id ? "#4D8BFF" : "#2E3E62",
            weight: selectedTripId === trip.id ? 4 : 2,
            opacity: 0.8,
          },
        ).addTo(markerLayer);
      }

      const marker = L.circleMarker([lat, lng], {
        radius: selectedTripId === trip.id ? 10 : 8,
        color: "#0A0F1C",
        fillColor: trip.loadPct >= 85 ? "#F87171" : trip.loadPct >= 60 ? "#FBBF24" : "#34D399",
        fillOpacity: 1,
        weight: 2,
      }).addTo(markerLayer);

      marker.bindPopup(
        `<strong>${trip.id}</strong><br/>${trip.from} → ${trip.to}<br/>${lang === "en" ? "Passengers" : "Пасажири"}: ${trip.passengers}/${trip.capacity}`,
      );
      marker.on("click", () => onSelectTrip(trip.id));
    });
  }, [lang, onSelectTrip, selectedTripId, trips]);

  return <div ref={mapRef} className="map-canvas" />;
}
