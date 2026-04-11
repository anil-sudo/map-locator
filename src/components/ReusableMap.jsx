import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const DEFAULT_MARKER_COLORS = {
  hq: '#0A3161',
  branch: '#1A6B3C',
  active: '#00A0DC',
};

const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const ReusableMap = ({
  offices = [],
  highlightedIndex = -1,
  onMarkerClick,
  userLocation = null,
  renderPopup = null,
  initialCenter = [10, 50],
  initialZoom = 4,
  mapStyle = DEFAULT_STYLE,
  markerColors = {},
  className = '',
  style = {},
}) => {
  const containerRef     = useRef(null);
  const mapRef           = useRef(null);
  const mapReadyRef      = useRef(false);   // true once 'load' fires
  const markersRef       = useRef({});
  const popupRef         = useRef(null);
  const userMarkerRef    = useRef(null);

  // ── Always-current refs so click listeners never go stale ──────────────────
  const onMarkerClickRef  = useRef(onMarkerClick);
  const officesRef        = useRef(offices);
  const highlightedRef    = useRef(highlightedIndex);
  const renderPopupRef    = useRef(renderPopup);

  useEffect(() => { onMarkerClickRef.current  = onMarkerClick;    }, [onMarkerClick]);
  useEffect(() => { officesRef.current        = offices;          }, [offices]);
  useEffect(() => { highlightedRef.current    = highlightedIndex; }, [highlightedIndex]);
  useEffect(() => { renderPopupRef.current    = renderPopup;      }, [renderPopup]);

  const colors = { ...DEFAULT_MARKER_COLORS, ...markerColors };

  // ─── Build popup HTML ───────────────────────────────────────────────────────
  const buildPopupHTML = (office) => {
    if (renderPopupRef.current) return renderPopupRef.current(office);

    const contactsHTML = (office.contacts || [])
      .map((c) => `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
          <span style="font-size:13px;">${c.type === 'phone' ? '📞' : '✉️'}</span>
          <span style="font-size:13px;color:#444;">${c.value}</span>
        </div>`)
      .join('');

    return `
      <div style="font-family:sans-serif;min-width:220px;">
        <div style="background:#0A3161;color:white;padding:12px;font-weight:bold;
                    border-radius:8px 8px 0 0;font-size:14px;">${office.name}</div>
        <div style="background:white;padding:15px;border-radius:0 0 8px 8px;
                    border:1px solid #eee;border-top:none;">
          <div style="margin-bottom:10px;">
            <span style="color:#666;font-size:11px;text-transform:uppercase;
                         font-weight:bold;display:block;">Office Type</span>
            <strong>${office.type}</strong>
          </div>
          ${contactsHTML}
        </div>
      </div>`;
  };

  // ─── Open popup ─────────────────────────────────────────────────────────────
  const openPopup = (office) => {
    if (!mapRef.current) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const popup = new maplibregl.Popup({ offset: 25, closeOnClick: false })
      .setLngLat([office.longitude, office.latitude])
      .setHTML(buildPopupHTML(office))
      .addTo(mapRef.current);

    popup.on('close', () => { popupRef.current = null; });
    popupRef.current = popup;
  };

  // ─── Sync markers: create missing ones, update highlight styles ─────────────
  const syncMarkers = useCallback(() => {
    if (!mapReadyRef.current || !mapRef.current) return;

    const currentOffices = officesRef.current;
    const currentHighlight = highlightedRef.current;
    const officeNames = new Set(currentOffices.map((o) => o.name));

    // Remove stale markers
    Object.keys(markersRef.current).forEach((name) => {
      if (!officeNames.has(name)) {
        markersRef.current[name].remove();
        delete markersRef.current[name];
      }
    });

    // Add new markers / update existing highlight state
    currentOffices.forEach((office, index) => {
      if (!markersRef.current[office.name]) {
        // ── Create marker element ──
        const el = document.createElement('div');
        el.className = 'rm-marker';
        const size = office.type === 'HQ' ? '24px' : '16px';
        const bg   = office.type === 'HQ' ? colors.hq : colors.branch;
        el.innerHTML = `
          <div style="width:${size};height:${size};background:${bg};border-radius:50%;
                      border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);
                      transition:all 0.25s ease;cursor:pointer;"></div>`;

        // ── Click always reads latest handler + offices via refs ──
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Read current office list so index is always fresh
          const latestOffices = officesRef.current;
          const latestIndex   = latestOffices.findIndex((o) => o.name === office.name);
          onMarkerClickRef.current?.(office, latestIndex);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([office.longitude, office.latitude])
          .addTo(mapRef.current);

        markersRef.current[office.name] = marker;
      }

      // ── Update active/inactive style ──
      const dot = markersRef.current[office.name].getElement().querySelector('div');
      const isActive = currentHighlight === index;

      dot.style.background  = isActive ? colors.active : office.type === 'HQ' ? colors.hq : colors.branch;
      dot.style.boxShadow   = isActive ? `0 0 10px ${colors.active}` : '0 0 5px rgba(0,0,0,0.3)';
      dot.style.transform   = isActive ? 'scale(1.25)' : 'scale(1)';
    });
  }, [colors]); // colors is the only stable dependency needed

  // ─── Re-sync whenever offices or highlight changes ──────────────────────────
  useEffect(() => {
    syncMarkers();
  }, [offices, highlightedIndex, syncMarkers]);

  // ─── Popup: open/close when highlightedIndex changes ───────────────────────
  useEffect(() => {
    if (!mapReadyRef.current) return;
    if (highlightedIndex >= 0 && highlightedIndex < offices.length) {
      openPopup(offices[highlightedIndex]);
    } else {
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    }
  }, [highlightedIndex, offices]);

  // ─── Fly to highlighted office ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    if (highlightedIndex >= 0 && highlightedIndex < offices.length) {
      const { longitude, latitude } = offices[highlightedIndex];
      mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, speed: 1.2, curve: 1.1 });
    }
  }, [highlightedIndex, offices]);

  // ─── User location dot ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement('div');
    el.className = 'rm-user-marker';

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(mapRef.current);

    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 12 });
  }, [userLocation]);

  // ─── Initialize map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: initialZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current   = map;
      mapReadyRef.current = true;
      syncMarkers();

      // Handle any pending highlight that arrived before map was ready
      const hi = highlightedRef.current;
      const ofs = officesRef.current;
      if (hi >= 0 && hi < ofs.length) {
        openPopup(ofs[hi]);
        map.flyTo({ center: [ofs[hi].longitude, ofs[hi].latitude], zoom: 14, speed: 1.2, curve: 1.1 });
      }
    });

    return () => {
      mapReadyRef.current = false;
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      if (popupRef.current)    { popupRef.current.remove();    popupRef.current    = null; }
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        .rm-user-marker {
          width: 20px; height: 20px;
          background: #00A0DC;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 10px rgba(0,160,220,0.5);
          pointer-events: none;
          animation: rm-pulse 2s infinite;
        }
        @keyframes rm-pulse {
          0%   { transform: scale(1);   box-shadow: 0 0 0 0    rgba(0,160,220,0.7); }
          70%  { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0,160,220,0);   }
          100% { transform: scale(1);   box-shadow: 0 0 0 0    rgba(0,160,220,0);   }
        }
        .maplibregl-popup-content {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .maplibregl-popup-close-button {
          top: 10px; right: 10px; color: white; font-size: 18px;
        }
      `}</style>
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%', ...style }}
      />
    </>
  );
};

export default ReusableMap;
