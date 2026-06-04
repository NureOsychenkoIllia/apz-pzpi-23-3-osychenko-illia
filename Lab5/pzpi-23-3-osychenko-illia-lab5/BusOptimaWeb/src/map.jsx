/* Leaflet-backed live map for dispatcher */
/* global React, L, BO */
const { useEffect, useRef } = React;

// Find city coords by key OR by Ukrainian/English name string
function cityCoords(nameOrKey) {
  if (!nameOrKey) return null;
  if (BO.cities[nameOrKey]) return BO.cities[nameOrKey];
  return Object.values(BO.cities).find(c =>
    c.name_uk === nameOrKey || c.name_en === nameOrKey
  ) ?? null;
}

// Interpolate lat/lng for a trip based on progress (0–1)
function tripPosition(trip) {
  if (trip.lat != null && trip.lng != null) return { lat: trip.lat, lng: trip.lng };
  const a = cityCoords(trip.from);
  const b = cityCoords(trip.to);
  if (!a || !b) return null;
  const p = trip.progress ?? 0.5;
  return { lat: a.lat + (b.lat - a.lat) * p, lng: a.lng + (b.lng - a.lng) * p };
}

function LiveMap({ trips: tripsProp, selectedTripId, onSelectTrip, lang = 'uk', height = 560 }) {
  const trips = tripsProp ?? BO.trips;
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: [49.0, 31.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap · © CARTO'
    }).addTo(map);
    mapRef.current = map;

    // Draw static route lines from mock routes (city keys)
    BO.routes.forEach(r => {
      const a = BO.cities[r.from], b = BO.cities[r.to];
      if (!a || !b) return;
      L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
        color: r.status === 'active' ? '#4D8BFF' : '#6B7895',
        weight: 1.4,
        opacity: r.status === 'active' ? 0.55 : 0.25,
        dashArray: r.status === 'active' ? null : '4,4',
      }).addTo(map);
    });

    // City labels
    Object.entries(BO.cities).forEach(([, c]) => {
      const dot = L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;gap:6px;transform:translate(8px,-8px);">
                 <div style="width:6px;height:6px;border-radius:50%;background:#9AA8C2;box-shadow:0 0 0 2px #0A0F1C;"></div>
                 <span style="font-family:'Manrope',sans-serif;font-size:11px;color:#9AA8C2;font-weight:600;text-shadow:0 1px 4px #0A0F1C;">${lang === 'en' ? c.name_en : c.name_uk}</span>
               </div>`,
        iconSize: [0, 0],
      });
      L.marker([c.lat, c.lng], { icon: dot, interactive: false }).addTo(map);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update bus markers whenever trips or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    trips.forEach(t => {
      const pos = tripPosition(t);
      if (!pos) return;

      const loadClass = BO.loadColor(t.loadPct);
      const isSelected = t.id === selectedTripId;
      const html = `<div class="bus-marker ${loadClass}" style="${isSelected ? 'transform:scale(1.18);box-shadow:0 0 0 3px var(--accent),0 6px 16px rgba(0,0,0,.6);' : ''}">${t.passengers}</div>`;
      const icon = L.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] });
      const m = L.marker([pos.lat, pos.lng], { icon }).addTo(map);
      m.on('click', () => onSelectTrip && onSelectTrip(t.id));
      m.bindTooltip(
        `<div style="font-family:'Manrope',sans-serif;font-size:12px;line-height:1.45;">
           <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${t.id} · ${t.from} → ${t.to}</div>
           <div style="color:#9AA8C2;">${t.passengers}/${t.capacity} (${t.loadPct}%) · ${t.currentPrice} ₴</div>
         </div>`,
        { direction: 'top', offset: [0, -10], opacity: 0.98, className: 'bus-tooltip' }
      );
      markersRef.current[t.id] = m;
    });
  }, [trips, selectedTripId, lang]);

  return (
    <div className="map-wrap" style={{ height }}>
      <div ref={elRef} style={{ width: '100%', height: '100%' }}/>
      <div className="map-overlay bl">
        <div className="caption" style={{ marginBottom: 8 }}>{lang === 'en' ? 'Load legend' : 'Завантаженість'}</div>
        <div className="legend-row"><div className="legend-sw" style={{ background: 'var(--load-low)' }}/> &lt; 30%</div>
        <div className="legend-row"><div className="legend-sw" style={{ background: 'var(--load-ok)' }}/> 30–60%</div>
        <div className="legend-row"><div className="legend-sw" style={{ background: 'var(--load-busy)' }}/> 60–85%</div>
        <div className="legend-row"><div className="legend-sw" style={{ background: 'var(--load-over)' }}/> &gt; 85%</div>
      </div>
      <div className="map-overlay tr">
        <div className="caption">{lang === 'en' ? 'Active' : 'У русі'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{trips.length}</div>
      </div>
    </div>
  );
}

window.LiveMap = LiveMap;
