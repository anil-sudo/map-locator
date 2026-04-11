import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReusableMap from './src/components/ReusableMap';
import './src/styles/App.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const offices = [
  { id: 'sc-lon-hq',  name: "Standard Chartered London Head Office",         latitude: 51.5074, longitude: -0.1278,  type: "HQ",     contacts: [{ type: "phone", value: "+44 20 7885 8888" }, { type: "email", value: "london.hq@sc.com" }] },
  { id: 'sc-lon-cw',  name: "Standard Chartered London Canary Wharf Branch", latitude: 51.5055, longitude: -0.0235,  type: "Branch", contacts: [{ type: "phone", value: "+44 20 7515 5555" }, { type: "email", value: "canarywharf.branch@sc.com" }] },
  { id: 'sc-fra',     name: "Standard Chartered Frankfurt Branch",            latitude: 50.1109, longitude:  8.6821,  type: "Branch", contacts: [{ type: "phone", value: "+49 69 123456"    }, { type: "email", value: "frankfurt.branch@sc.com" }] },
  { id: 'sc-par',     name: "Standard Chartered Paris Branch",                latitude: 48.8566, longitude:  2.3522,  type: "Branch", contacts: [{ type: "phone", value: "+33 1 23456789"   }, { type: "email", value: "paris.branch@sc.com" }] },
  { id: 'sc-mil',     name: "Standard Chartered Milan Branch",                latitude: 45.4642, longitude:  9.1900,  type: "Branch", contacts: [{ type: "phone", value: "+39 02 1234567"   }, { type: "email", value: "milan.branch@sc.com" }] },
  { id: 'sc-mad',     name: "Standard Chartered Madrid Branch",               latitude: 40.4168, longitude: -3.7038,  type: "Branch", contacts: [{ type: "phone", value: "+34 91 1234567"   }, { type: "email", value: "madrid.branch@sc.com" }] },
  { id: 'sc-ams',     name: "Standard Chartered Amsterdam Branch",            latitude: 52.3676, longitude:  4.9041,  type: "Branch", contacts: [{ type: "phone", value: "+31 20 1234567"   }, { type: "email", value: "amsterdam.branch@sc.com" }] },
  { id: 'sc-zur',     name: "Standard Chartered Zurich Branch",               latitude: 47.3769, longitude:  8.5417,  type: "Branch", contacts: [{ type: "phone", value: "+41 44 1234567"   }, { type: "email", value: "zurich.branch@sc.com" }] },
  { id: 'sc-vie',     name: "Standard Chartered Vienna Branch",               latitude: 48.2082, longitude: 16.3738,  type: "Branch", contacts: [{ type: "phone", value: "+43 1 123456"     }, { type: "email", value: "vienna.branch@sc.com" }] },
  { id: 'sc-bru',     name: "Standard Chartered Brussels Branch",             latitude: 50.8503, longitude:  4.3517,  type: "Branch", contacts: [{ type: "phone", value: "+32 2 1234567"    }, { type: "email", value: "brussels.branch@sc.com" }] },
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

/**
 * Builds the popup HTML for an office. Lives in App.jsx because it is
 * business-domain logic (contacts, badge colours, office type) — not
 * map logic. Injected into ReusableMap via the renderPopup prop.
 */
const renderOfficePopup = (office) => {
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

const PAGE_SIZE = 4;

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [filter, setFilter]             = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [viewMode, setViewMode]         = useState('list');

  const cardRefs    = useRef([]);
  const sidebarRef  = useRef(null);
  const sentinelRef = useRef(null);

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
      <nav className="navbar">
        <span className="navbar__title">SC | Branch Locator</span>
        <span className="navbar__count">{filteredOffices.length} Offices Found</span>
      </nav>

      <div className="main-container">

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside
          className={`sidebar ${viewMode === 'map' ? 'sidebar--hidden' : ''}`}
          ref={sidebarRef}
        >
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
                  key={office.id}
                  ref={(el) => (cardRefs.current[globalIdx] = el)}
                  className={`office-card ${office.name === selectedName ? 'highlighted' : ''}`}
                  onClick={() => handleCardClick(office)}
                >
                  <div className="office-card__name">{office.name}</div>
                  <div className="office-card__meta">
                    <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                    {office.distance != null && (
                      <span className="distance-label">{office.distance.toFixed(1)} km away</span>
                    )}
                  </div>
                  {office.contacts.length > 0 && (
                    <div className="office-card__contact">
                      <span>📞</span> {office.contacts[0].value}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div ref={sentinelRef} className="scroll-sentinel">
                <div className="spinner" />
              </div>
            )}
          </div>
        </aside>

        {/* ── Map ─────────────────────────────────────────────── */}
        <div className={`map-wrapper ${viewMode === 'list' && typeof window !== 'undefined' && window.innerWidth <= 680 ? 'map-wrapper--hidden' : ''}`}>
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
            locations={filteredOffices}
            highlightedIndex={highlightedIndex}
            onMarkerClick={handleMarkerClick}
            userLocation={userLocation}
            renderPopup={renderOfficePopup}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </>
  );
};

export default App;
