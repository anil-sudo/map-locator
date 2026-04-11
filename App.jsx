<<<<<<< HEAD
=======
import { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
>>>>>>> 94f101eb995c6fd6bca4a98a113f45c0f1bdcc5c


import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReusableMap from './src/components/ReusableMap';

// ─── Data ─────────────────────────────────────────────────────────────────────
const offices = [
  { name: "Standard Chartered London Head Office",         latitude: 51.5074, longitude: -0.1278,  type: "HQ",     contacts: [{ type: "phone", value: "+44 20 7885 8888" }, { type: "email", value: "london.hq@sc.com" }] },
  { name: "Standard Chartered London Canary Wharf Branch", latitude: 51.5055, longitude: -0.0235,  type: "Branch", contacts: [{ type: "phone", value: "+44 20 7515 5555" }, { type: "email", value: "canarywharf.branch@sc.com" }] },
  { name: "Standard Chartered Frankfurt Branch",           latitude: 50.1109, longitude:  8.6821,  type: "Branch", contacts: [{ type: "phone", value: "+49 69 123456"    }, { type: "email", value: "frankfurt.branch@sc.com" }] },
  { name: "Standard Chartered Paris Branch",               latitude: 48.8566, longitude:  2.3522,  type: "Branch", contacts: [{ type: "phone", value: "+33 1 23456789"   }, { type: "email", value: "paris.branch@sc.com" }] },
  { name: "Standard Chartered Milan Branch",               latitude: 45.4642, longitude:  9.1900,  type: "Branch", contacts: [{ type: "phone", value: "+39 02 1234567"   }, { type: "email", value: "milan.branch@sc.com" }] },
  { name: "Standard Chartered Madrid Branch",              latitude: 40.4168, longitude: -3.7038,  type: "Branch", contacts: [{ type: "phone", value: "+34 91 1234567"   }, { type: "email", value: "madrid.branch@sc.com" }] },
  { name: "Standard Chartered Amsterdam Branch",           latitude: 52.3676, longitude:  4.9041,  type: "Branch", contacts: [{ type: "phone", value: "+31 20 1234567"   }, { type: "email", value: "amsterdam.branch@sc.com" }] },
  { name: "Standard Chartered Zurich Branch",              latitude: 47.3769, longitude:  8.5417,  type: "Branch", contacts: [{ type: "phone", value: "+41 44 1234567"   }, { type: "email", value: "zurich.branch@sc.com" }] },
  { name: "Standard Chartered Vienna Branch",              latitude: 48.2082, longitude: 16.3738,  type: "Branch", contacts: [{ type: "phone", value: "+43 1 123456"     }, { type: "email", value: "vienna.branch@sc.com" }] },
  { name: "Standard Chartered Brussels Branch",            latitude: 50.8503, longitude:  4.3517,  type: "Branch", contacts: [{ type: "phone", value: "+32 2 1234567"    }, { type: "email", value: "brussels.branch@sc.com" }] },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const PAGE_SIZE = 4;

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [filter, setFilter]             = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [viewMode, setViewMode]         = useState('list');

<<<<<<< HEAD
  const cardRefs    = useRef([]);
  const sidebarRef  = useRef(null);
  const sentinelRef = useRef(null); // ← IntersectionObserver target
=======
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const cardRefs = useRef([]);
  const userMarkerRef = useRef(null);
  const popupRef = useRef(null);
>>>>>>> 94f101eb995c6fd6bca4a98a113f45c0f1bdcc5c

  const debouncedSearch = useDebounce(searchTerm, 220);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const officesWithDistance = useMemo(() => {
    if (!userLocation) return offices;
    return offices.map((o) => ({
      ...o,
      distance: haversineDistance(userLocation.lat, userLocation.lng, o.latitude, o.longitude),
    }));
  }, [userLocation]);

  const filteredOffices = useMemo(() => {
    return officesWithDistance
      .filter((o) => o.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .filter((o) => filter === 'all' || o.type.toLowerCase() === filter)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [officesWithDistance, debouncedSearch, filter]);

  // Reset pagination + clear selection when list changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (selectedName && !filteredOffices.some((o) => o.name === selectedName)) {
      setSelectedName(null);
    }
  }, [filteredOffices]);

  // ─── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filteredOffices.length) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredOffices.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredOffices.length]);

  const visibleOffices   = filteredOffices.slice(0, visibleCount);
  const hasMore          = visibleCount < filteredOffices.length;

  const highlightedIndex = selectedName
    ? filteredOffices.findIndex((o) => o.name === selectedName)
    : -1;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCardClick = useCallback((office) => {
    setSelectedName(office.name);
    if (window.innerWidth <= 680) setViewMode('map');
  }, []);

  const handleMarkerClick = useCallback((office) => {
    setSelectedName(office.name);
    const globalIdx = offices.findIndex((o) => o.name === office.name);
    cardRefs.current[globalIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.innerWidth <= 680) setViewMode('list');
  }, []);

  const handleLocationClick = useCallback(() => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        if (window.innerWidth <= 680) setViewMode('map');
      },
      () => alert('Unable to retrieve your location.')
    );
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Serif+Display&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'DM Sans', sans-serif; overflow: hidden; background: #F5F4F0; }

        .navbar {
          position: fixed; top: 0; left: 0; right: 0; height: 64px;
          background: #0A3161; color: white;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px;
          font-family: 'DM Serif Display', serif;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12); z-index: 2000;
        }

        .main-container { display: flex; margin-top: 64px; height: calc(100vh - 64px); }

        .sidebar {
          width: 360px; background: #F5F4F0;
          display: flex; flex-direction: column;
          border-right: 1px solid rgba(0,0,0,0.08);
          overflow: hidden; z-index: 5;
        }

        .sticky-header { padding: 24px 24px 12px; background: #F5F4F0; backdrop-filter: blur(8px); }

        .search-input {
          width: 100%; padding: 14px 18px; margin-bottom: 16px;
          border: 1px solid #E0DED7; border-radius: 12px; font-size: 15px;
          background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
        }
        .search-input:focus {
          outline: none; border-color: #0A3161;
          box-shadow: 0 0 0 3px rgba(10,49,97,0.1);
        }

        .filter-buttons { display: flex; gap: 8px; margin-bottom: 10px; overflow-x: auto; }
        .filter-button {
          padding: 10px 20px; border: 1px solid #E0DED7; background: white;
          border-radius: 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap; color: #555;
          transition: all 0.2s; font-family: inherit;
        }
        .filter-button.active { background: #0A3161; color: white; border-color: #0A3161; }

        .result-count { font-size: 0.82rem; color: #888; font-weight: 600; padding-bottom: 4px; }

        .list-content { flex: 1; overflow-y: auto; padding: 12px 24px 40px; }

        .office-card {
          background: white; border-radius: 16px; padding: 20px; margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03); cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s, border-color 0.2s, background 0.2s;
        }
        .office-card:hover       { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .office-card.highlighted { border-color: #00A0DC; background: #F0F9FF; }

        .office-name { font-weight: 700; font-size: 17px; color: #0A3161; line-height: 1.3; margin-bottom: 10px; }

        .badge {
          display: inline-block; padding: 4px 12px; border-radius: 6px;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
        }
        .badge.hq     { background: #0A3161; color: white; }
        .badge.branch { background: #1A6B3C; color: white; }

        .distance-label { font-size: 0.8rem; color: #666; font-weight: 600; }

        /* ── Spinner for infinite scroll sentinel ── */
        .scroll-sentinel {
          height: 56px; display: flex; align-items: center; justify-content: center;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 22px; height: 22px;
          border: 3px solid #E0DED7; border-top-color: #0A3161;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }

        .map-wrapper { flex: 1; height: 100%; position: relative; }

        .location-button {
          position: absolute; bottom: 32px; right: 32px;
          width: 52px; height: 52px; background: white; border: none; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15); z-index: 1000; color: #0A3161;
          transition: background 0.2s, transform 0.2s;
        }
        .location-button:hover { background: #F0F7FF; transform: scale(1.05); }

        .back-to-list-btn {
          position: absolute; top: 20px; left: 20px;
          background: #0A3161; color: white; border: none; border-radius: 30px;
          padding: 10px 18px; font-size: 13px; font-weight: 700;
          display: none; align-items: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1000; cursor: pointer;
          font-family: inherit;
        }

        @media (max-width: 680px) {
          .sidebar     { width: 100%; border-right: none; display: ${viewMode === 'list' ? 'flex' : 'none'}; }
          .map-wrapper { width: 100%; display: ${viewMode === 'map' ? 'block' : 'none'}; }
          .back-to-list-btn { display: flex; }
        }
      `}</style>

      <nav className="navbar">
        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>SC | Branch Locator</span>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{filteredOffices.length} Offices Found</span>
      </nav>

      <div className="main-container">
<<<<<<< HEAD

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside className="sidebar" ref={sidebarRef}>
=======
        <div className="sidebar">
>>>>>>> 94f101eb995c6fd6bca4a98a113f45c0f1bdcc5c
          <div className="sticky-header">
            <input
              type="text"
              className="search-input"
              placeholder="Search by city or branch name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-buttons">
              {['all', 'branch', 'hq'].map((f) => (
                <button
                  key={f}
                  className={`filter-button ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'branch' ? 'Branches' : 'Headquarters'}
                </button>
              ))}
            </div>
            <p className="result-count">
              Showing {visibleOffices.length} of {filteredOffices.length} results
            </p>
          </div>

          <div className="list-content">
            {visibleOffices.map((office) => {
              const globalIdx = offices.findIndex((o) => o.name === office.name);
              return (
                <div
                  key={office.name}
                  ref={(el) => (cardRefs.current[globalIdx] = el)}
                  className={`office-card ${office.name === selectedName ? 'highlighted' : ''}`}
                  onClick={() => handleCardClick(office)}
                >
                  <div className="office-name">{office.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                    {office.distance != null && (
                      <span className="distance-label">{office.distance.toFixed(1)} km away</span>
                    )}
                  </div>
                  {office.contacts.length > 0 && (
                    <div style={{ marginTop: 14, fontSize: '0.85rem', color: '#444', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>📞</span> {office.contacts[0].value}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sentinel — observed by IntersectionObserver to trigger next page */}
            {hasMore && (
              <div ref={sentinelRef} className="scroll-sentinel">
                <div className="spinner" />
              </div>
            )}
          </div>
        </aside>

        {/* ── Map ─────────────────────────────────────────────── */}
        <div className="map-wrapper">
          <button className="back-to-list-btn" onClick={() => setViewMode('list')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to List
          </button>

          <button className="location-button" onClick={handleLocationClick} title="Use my location">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>

          <ReusableMap
            offices={filteredOffices}
            highlightedIndex={highlightedIndex}
            onMarkerClick={handleMarkerClick}
            userLocation={userLocation}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </>
  );
};

export default App;
