/**
 * ReusableMap
 * -----------
 * A fully abstracted MapLibre GL map component. Domain-agnostic by design —
 * it knows nothing about offices, branches, or contacts. All data-shape
 * knowledge lives in the consumer (App.jsx) or is injected via renderPopup.
 *
 * Props
 * ─────
 * @prop {Array}    locations        Required. Array of location objects.
 *                                   Each must have: { latitude, longitude, id, type? }
 *                                   Additional fields are passed through to callbacks/renderPopup.
 * @prop {number}   [highlightedIndex=-1]
 *                                   Index of the currently highlighted marker.
 *                                   -1 means no highlight.
 * @prop {Function} [onMarkerClick]  Called with (locationObject, index) when a marker is clicked.
 * @prop {Object}   [userLocation]   Optional { lat, lng } for the user's position dot.
 * @prop {Function} [renderPopup]    (locationObject) => HTML string.
 *                                   If omitted, a minimal label-only popup is shown.
 * @prop {Array}    [initialCenter=[10,50]]  [lng, lat] map starting center.
 * @prop {number}   [initialZoom=4]  Starting zoom level.
 * @prop {string}   [mapStyle]       MapLibre style URL.
 * @prop {Object}   [markerColors]   Override default marker colors.
 *                                   Shape: { default, active, hq, branch, ... }
 *                                   Any key matching location.type (lowercased) is used.
 * @prop {string}   [className]      Extra CSS class on the container div.
 * @prop {Object}   [style]          Inline style overrides on the container div.
 *
 * Ref API (via forwardRef + useImperativeHandle)
 * ──────────────────────────────────────────────
 * Attach a ref to access imperative methods:
 *   mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
 *   mapRef.current.showPopup([lng, lat], '<p>Hello</p>')
 *   mapRef.current.closePopup()
 *   mapRef.current.getMap()   → raw MapLibre Map instance
 *
 * Usage Examples
 * ──────────────
 * 1. Branch locator (multiple locations):
 *    <ReusableMap
 *      locations={branches}
 *      highlightedIndex={selectedIdx}
 *      onMarkerClick={(loc, idx) => setSelected(idx)}
 *      renderPopup={(loc) => `<strong>${loc.name}</strong>`}
 *    />
 *
 * 2. Single user address:
 *    <ReusableMap
 *      locations={[{ latitude: 51.5, longitude: -0.1, id: 'home', label: 'My Home' }]}
 *      initialZoom={14}
 *    />
 *
 * 3. Delivery tracking (custom popup, imperative flyTo):
 *    const mapRef = useRef();
 *    <ReusableMap
 *      ref={mapRef}
 *      locations={deliveries}
 *      renderPopup={(d) => `<div>Driver: ${d.driver} — ETA: ${d.eta}</div>`}
 *    />
 *    // Later: mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
 */

import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/ReusableMap.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MARKER_COLORS = {
  default: '#555555',
  active:  '#00A0DC',
  hq:      '#0A3161',
  branch:  '#1A6B3C',
};

const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the fill color for a marker based on its type and active state.
 * Falls back to colors.default if no type-specific key is found.
 */
const resolveMarkerColor = (location, isActive, colors) => {
  if (isActive) return colors.active;
  const typeKey = location.type?.toLowerCase();
  return (typeKey && colors[typeKey]) ? colors[typeKey] : colors.default;
};

/**
 * Minimal fallback popup. Renders location.label or location.name.
 * Intentionally generic — no domain-specific fields assumed.
 */
const defaultRenderPopup = (location) => `
  <div style="font-family:sans-serif;padding:12px 16px;min-width:160px;">
    <strong style="font-size:14px;">${location.label ?? location.name ?? 'Location'}</strong>
  </div>
`;

// ─── Component ────────────────────────────────────────────────────────────────

const ReusableMap = forwardRef(function ReusableMap(
  {
    locations        = [],
    highlightedIndex = -1,
    onMarkerClick,
    userLocation     = null,
    renderPopup      = null,
    initialCenter    = [10, 50],
    initialZoom      = 4,
    mapStyle         = DEFAULT_STYLE,
    markerColors     = {},
    className        = '',
    style            = {},
  },
  ref
) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const mapReadyRef     = useRef(false);
  const markersRef      = useRef({});
  const popupRef        = useRef(null);
  const userMarkerRef   = useRef(null);

  // Always-current refs — prevent stale closures in event listeners
  const onMarkerClickRef  = useRef(onMarkerClick);
  const locationsRef      = useRef(locations);
  const highlightedRef    = useRef(highlightedIndex);
  const renderPopupRef    = useRef(renderPopup);

  useEffect(() => { onMarkerClickRef.current = onMarkerClick;    }, [onMarkerClick]);
  useEffect(() => { locationsRef.current     = locations;        }, [locations]);
  useEffect(() => { highlightedRef.current   = highlightedIndex; }, [highlightedIndex]);
  useEffect(() => { renderPopupRef.current   = renderPopup;      }, [renderPopup]);

  // Stable merged color map — only recomputes when markerColors prop changes
  const colors = useMemo(
    () => ({ ...DEFAULT_MARKER_COLORS, ...markerColors }),
    [markerColors]
  );

  // ─── Imperative API (exposed via ref) ──────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /** Fly to a position. Accepts any MapLibre flyTo options object. */
    flyTo: (options) => mapRef.current?.flyTo(options),

    /** Show a popup at [lng, lat] with arbitrary HTML content. */
    showPopup: ([lng, lat], html) => {
      if (!mapRef.current) return;
      popupRef.current?.remove();
      const popup = new maplibregl.Popup({ offset: 25, closeOnClick: false })
        .setLngLat([lng, lat])
        .setHTML(html)
        .addTo(mapRef.current);
      popup.on('close', () => { popupRef.current = null; });
      popupRef.current = popup;
    },

    /** Close the currently open popup, if any. */
    closePopup: () => {
      popupRef.current?.remove();
      popupRef.current = null;
    },

    /** Escape hatch: returns the raw MapLibre Map instance. */
    getMap: () => mapRef.current,
  }));

  // ─── Popup helpers ─────────────────────────────────────────────────────────

  const openPopup = useCallback((location) => {
    if (!mapRef.current) return;
    popupRef.current?.remove();

    const html = (renderPopupRef.current ?? defaultRenderPopup)(location);
    const popup = new maplibregl.Popup({ offset: 25, closeOnClick: false })
      .setLngLat([location.longitude, location.latitude])
      .setHTML(html)
      .addTo(mapRef.current);

    popup.on('close', () => { popupRef.current = null; });
    popupRef.current = popup;
  }, []);

  // ─── Marker sync ───────────────────────────────────────────────────────────

  const syncMarkers = useCallback(() => {
    if (!mapReadyRef.current || !mapRef.current) return;

    const currentLocations = locationsRef.current;
    const currentHighlight = highlightedRef.current;
    const locationIds = new Set(currentLocations.map((l) => l.id ?? l.name));

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!locationIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add new markers / update existing ones
    currentLocations.forEach((location, index) => {
      const id = location.id ?? location.name;
      const isActive = currentHighlight === index;

      if (!markersRef.current[id]) {
        const el = document.createElement('div');
        el.className = 'rm-marker';
        const size = location.type === 'HQ' ? '24px' : '16px';
        el.innerHTML = `
          <div style="
            width:${size}; height:${size};
            border-radius:50%;
            border:2px solid white;
            box-shadow:0 0 5px rgba(0,0,0,0.3);
            transition:all 0.25s ease;
            cursor:pointer;
          "></div>`;

        // Click reads latest handler and locations via refs — never stale
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const latestLocations = locationsRef.current;
          const latestIndex = latestLocations.findIndex((l) => (l.id ?? l.name) === id);
          onMarkerClickRef.current?.(location, latestIndex);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([location.longitude, location.latitude])
          .addTo(mapRef.current);

        markersRef.current[id] = marker;
      }

      // Update visual state (active/inactive)
      const dot = markersRef.current[id].getElement().querySelector('div');
      dot.style.background  = resolveMarkerColor(location, isActive, colors);
      dot.style.boxShadow   = isActive ? `0 0 10px ${colors.active}` : '0 0 5px rgba(0,0,0,0.3)';
      dot.style.transform   = isActive ? 'scale(1.25)' : 'scale(1)';
    });
  }, [colors]);

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Re-sync markers whenever locations or highlighted index changes
  useEffect(() => {
    syncMarkers();
  }, [locations, highlightedIndex, syncMarkers]);

  // Open/close popup when highlighted index changes
  useEffect(() => {
    if (!mapReadyRef.current) return;
    if (highlightedIndex >= 0 && highlightedIndex < locations.length) {
      openPopup(locations[highlightedIndex]);
    } else {
      popupRef.current?.remove();
      popupRef.current = null;
    }
  }, [highlightedIndex, locations, openPopup]);

  // Fly to highlighted location
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    if (highlightedIndex >= 0 && highlightedIndex < locations.length) {
      const { longitude, latitude } = locations[highlightedIndex];
      mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, speed: 1.2, curve: 1.1 });
    }
  }, [highlightedIndex, locations]);

  // User location dot
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !userLocation) return;
    userMarkerRef.current?.remove();

    const el = document.createElement('div');
    el.className = 'rm-user-marker';

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(mapRef.current);

    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 12 });
  }, [userLocation]);

  // Initialize map once on mount
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     mapStyle,
      center:    initialCenter,
      zoom:      initialZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current      = map;
      mapReadyRef.current = true;
      syncMarkers();

      // Handle any highlight that arrived before map was ready
      const hi   = highlightedRef.current;
      const locs = locationsRef.current;
      if (hi >= 0 && hi < locs.length) {
        openPopup(locs[hi]);
        map.flyTo({ center: [locs[hi].longitude, locs[hi].latitude], zoom: 14, speed: 1.2, curve: 1.1 });
      }
    });

    return () => {
      mapReadyRef.current = false;
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      popupRef.current?.remove();
      popupRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
});

export default ReusableMap;
