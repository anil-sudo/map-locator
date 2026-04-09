import React, { useState, useEffect, useRef, useMemo } from 'react';

const offices = [
  { name: "Standard Chartered London Head Office", latitude: 51.5074, longitude: -0.1278, type: "HQ", contacts: [{ type: "phone", value: "+44 20 7885 8888" }, { type: "email", value: "london.hq@sc.com" }] },
  { name: "Standard Chartered London Canary Wharf Branch", latitude: 51.5055, longitude: -0.0235, type: "Branch", contacts: [{ type: "phone", value: "+44 20 7515 5555" }, { type: "email", value: "canarywharf.branch@sc.com" }] },
  { name: "Standard Chartered Frankfurt Branch", latitude: 50.1109, longitude: 8.6821, type: "Branch", contacts: [{ type: "phone", value: "+49 69 123456" }, { type: "email", value: "frankfurt.branch@sc.com" }] },
  { name: "Standard Chartered Paris Branch", latitude: 48.8566, longitude: 2.3522, type: "Branch", contacts: [{ type: "phone", value: "+33 1 23456789" }, { type: "email", value: "paris.branch@sc.com" }] },
  { name: "Standard Chartered Milan Branch", latitude: 45.4642, longitude: 9.19, type: "Branch", contacts: [{ type: "phone", value: "+39 02 1234567" }, { type: "email", value: "milan.branch@sc.com" }] },
  { name: "Standard Chartered Madrid Branch", latitude: 40.4168, longitude: -3.7038, type: "Branch", contacts: [{ type: "phone", value: "+34 91 1234567" }, { type: "email", value: "madrid.branch@sc.com" }] },
  { name: "Standard Chartered Amsterdam Branch", latitude: 52.3676, longitude: 4.9041, type: "Branch", contacts: [{ type: "phone", value: "+31 20 1234567" }, { type: "email", value: "amsterdam.branch@sc.com" }] },
  { name: "Standard Chartered Zurich Branch", latitude: 47.3769, longitude: 8.5417, type: "Branch", contacts: [{ type: "phone", value: "+41 44 1234567" }, { type: "email", value: "zurich.branch@sc.com" }] },
  { name: "Standard Chartered Vienna Branch", latitude: 48.2082, longitude: 16.3738, type: "Branch", contacts: [{ type: "phone", value: "+43 1 123456" }, { type: "email", value: "vienna.branch@sc.com" }] },
  { name: "Standard Chartered Brussels Branch", latitude: 50.8503, longitude: 4.3517, type: "Branch", contacts: [{ type: "phone", value: "+32 2 1234567" }, { type: "email", value: "brussels.branch@sc.com" }] }
];

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const useLeaflet = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    // Load CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  return isLoaded;
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(4);
  const [userLocation, setUserLocation] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map' for mobile

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const cardRefs = useRef([]);
  const userMarkerRef = useRef(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 220);
  const isLeafletLoaded = useLeaflet();

  const officesWithDistance = useMemo(() => {
    if (!userLocation) return offices;
    return offices.map(office => ({
      ...office,
      distance: haversineDistance(userLocation.lat, userLocation.lng, office.latitude, office.longitude)
    }));
  }, [userLocation]);

  const searchedOffices = useMemo(() => {
    return officesWithDistance.filter(office =>
      office.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [officesWithDistance, debouncedSearchTerm]);

  const filteredOffices = useMemo(() => {
    return searchedOffices.filter(office =>
      filter === 'all' || office.type.toLowerCase() === filter
    ).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }, [searchedOffices, filter]);

  useEffect(() => {
    setVisibleCount(4);
  }, [filteredOffices]);

  const visibleOffices = filteredOffices.slice(0, visibleCount);

  // Initialize Map
  useEffect(() => {
    if (isLeafletLoaded && mapRef.current && !mapRef.current._map) {
      const map = window.L.map(mapRef.current).setView([50, 10], 4);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      markersRef.current = offices.map((office, officeIndex) => {
        const iconHtml = office.type === 'HQ' 
          ? '<div style="width: 20px; height: 20px; background: #0A3161; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>'
          : '<div style="width: 12px; height: 12px; background: #28a745; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>';
        const icon = window.L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: office.type === 'HQ' ? [20, 20] : [12, 12],
          iconAnchor: office.type === 'HQ' ? [10, 10] : [6, 6]
        });
        const marker = window.L.marker([office.latitude, office.longitude], { icon }).addTo(map);
        
        const popupContent = `
          <div style="font-family: 'DM Sans', sans-serif; min-width: 250px; font-size: 14px;">
            <div style="background: #0A3161; color: white; padding: 10px; font-weight: bold; border-radius: 6px 6px 0 0; font-size: 16px;">
              ${office.name}
            </div>
            <div style="background: white; padding: 12px; border-radius: 0 0 6px 6px; line-height: 1.4;">
              <div style="margin-bottom: 8px;"><strong>Type:</strong> ${office.type}</div>
              ${office.contacts.map(contact => `<div style="margin-bottom: 4px;"><strong>${contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}:</strong> ${contact.value}</div>`).join('')}
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setHighlightedIndex(officeIndex);
          cardRefs.current[officeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return marker;
      });

      mapRef.current._map = map;
    }
  }, [isLeafletLoaded]);

  // Update Markers visibility
  useEffect(() => {
    if (isLeafletLoaded && mapRef.current && mapRef.current._map) {
      offices.forEach((office, index) => {
        const marker = markersRef.current[index];
        const isVisible = filteredOffices.some(filtered => filtered.name === office.name);
        if (isVisible) {
          if (!mapRef.current._map.hasLayer(marker)) {
            marker.addTo(mapRef.current._map);
          }
        } else {
          if (mapRef.current._map.hasLayer(marker)) {
            mapRef.current._map.removeLayer(marker);
          }
        }
      });
    }
  }, [filteredOffices, isLeafletLoaded]);

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapRef.current._map) {
            mapRef.current._map.flyTo([latitude, longitude], 13);
          }
          if (userMarkerRef.current) {
            mapRef.current._map.removeLayer(userMarkerRef.current);
          }
          const userIcon = window.L.divIcon({
            html: '<div class="pulsing-marker"></div>',
            className: 'custom-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          userMarkerRef.current = window.L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current._map);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please check your browser settings.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleCardClick = (office, globalIndex) => {
    setHighlightedIndex(globalIndex);
    const isMobile = window.innerWidth <= 680;
    
    if (isMobile) {
      setViewMode('map');
    }

    // Use a slightly longer timeout to wait for the CSS transition (0.3s)
    setTimeout(() => {
      if (mapRef.current._map) {
        // Essential: tell Leaflet the container size might have changed
        mapRef.current._map.invalidateSize();
        
        mapRef.current._map.flyTo([office.latitude, office.longitude], 14, {
          animate: true,
          duration: 1.5
        });
        
        markersRef.current[globalIndex].openPopup();
      }
    }, isMobile ? 350 : 50);
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Serif+Display&display=swap');

          body {
            font-family: 'DM Sans', sans-serif;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }

          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #0A3161;
            color: white;
            padding: 15px 20px;
            z-index: 2000;
            font-family: 'DM Serif Display', serif;
            font-size: 1.2em;
            font-weight: 400;
            height: 60px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .nav-title-desktop { display: inline; }
          .nav-title-mobile { display: none; }

          @media (max-width: 600px) {
            .nav-title-desktop { display: none; }
            .nav-title-mobile { display: inline; }
          }

          .main-container {
            display: flex;
            margin-top: 60px;
            height: calc(100vh - 60px);
            box-sizing: border-box;
            background-color: #F5F4F0;
            position: relative;
          }

          .sidebar {
            width: 360px;
            background-color: #F5F4F0;
            overflow-y: auto;
            position: relative;
            z-index: 5;
            transition: all 0.3s ease;
          }

          .sticky-header {
            position: sticky;
            top: 0;
            background-color: #F5F4F0;
            padding: 20px 20px 10px 20px;
            z-index: 10;
            border-bottom: 1px solid rgba(0,0,0,0.05);
          }

          .list-content {
            padding: 10px 20px 80px 20px;
          }

          .map-container {
            flex: 1;
            background-color: #F5F4F0;
            height: 100%;
            position: relative;
            z-index: 1;
          }

          .view-toggle {
            display: none;
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 3000;
            background: #0A3161;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 0.9em;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            cursor: pointer;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s active;
          }

          .view-toggle:active {
            transform: translateX(-50%) scale(0.95);
          }

          @media (max-width: 680px) {
            .view-toggle { display: flex; }
            
            .sidebar {
              position: absolute;
              top: 0;
              left: 0;
              width: 100% !important;
              height: 100%;
              transform: translateX(${viewMode === 'list' ? '0' : '-100%'});
              visibility: ${viewMode === 'list' ? 'visible' : 'hidden'};
            }

            .map-container {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              transform: translateX(${viewMode === 'map' ? '0' : '100%'});
              visibility: ${viewMode === 'map' ? 'visible' : 'hidden'};
            }
          }

          .map-chip {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 8px 16px;
            border-radius: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-size: 0.85em;
            font-weight: 700;
            z-index: 1000;
            white-space: nowrap;
          }

          .search-input {
            width: 100%;
            padding: 12px 16px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1em;
            box-sizing: border-box;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }

          .filter-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            overflow-x: auto;
            padding-bottom: 5px;
          }

          .filter-button {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
            transition: all 0.2s ease;
            white-space: nowrap;
          }

          .filter-button.active {
            background: #0A3161;
            color: white;
            border-color: #0A3161;
          }

          .location-button-map {
            position: absolute;
            bottom: 20px;
            right: 20px;
            padding: 12px;
            border: none;
            background: white;
            color: #0A3161;
            cursor: pointer;
            border-radius: 50%;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
          }

          .location-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
          }

          .office-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s ease;
          }

          .office-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }

          .office-card.highlighted {
            border-color: #0A3161;
            background: #f0f7ff;
          }

          .office-name {
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 1.05em;
            color: #0A3161;
          }

          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75em;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .hq { background-color: #0A3161; color: white; }
          .branch { background-color: #28a745; color: white; }

          .pulsing-marker {
            width: 20px;
            height: 20px;
            background: #007bff;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 10px rgba(0,123,255,0.5);
            animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }

          @keyframes pulse-ring {
            0% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
            100% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
          }
        `}
      </style>

      <nav className="navbar">
        <span className="nav-title-desktop">SC | Standard Chartered — Branch Locator Europe</span>
        <span className="nav-title-mobile">SC | Branch Locator</span>
        <span style={{ fontSize: '0.8em', opacity: 0.9 }}>{offices.length} Locations</span>
      </nav>

      <div className="main-container">
        <div className="sidebar">
          <div className="sticky-header">
            <input
              type="text"
              className="search-input"
              placeholder="Search by city or branch name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-buttons">
              <button className={`filter-button ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
              <button className={`filter-button ${filter === 'branch' ? 'active' : ''}`} onClick={() => setFilter('branch')}>Branches</button>
              <button className={`filter-button ${filter === 'hq' ? 'active' : ''}`} onClick={() => setFilter('hq')}>Headquarters</button>
            </div>
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
              Showing {visibleOffices.length} of {filteredOffices.length}
            </div>
          </div>

          <div className="list-content">
            {visibleOffices.map((office, index) => {
              const globalIndex = offices.findIndex(o => o.name === office.name);
              return (
                <div 
                  key={index} 
                  ref={el => cardRefs.current[globalIndex] = el} 
                  className={`office-card ${highlightedIndex === globalIndex ? 'highlighted' : ''}`} 
                  onClick={() => handleCardClick(office, globalIndex)}
                >
                  <div className="office-name">{office.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                    {office.distance && (
                      <span style={{ fontSize: '0.8em', color: '#666' }}>
                        • {office.distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                  {office.contacts.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#555' }}>
                      <div style={{ marginBottom: '2px' }}><strong>{office.contacts[0].type}:</strong> {office.contacts[0].value}</div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {visibleCount < filteredOffices.length && (
              <button className="load-more" onClick={() => setVisibleCount(prev => Math.min(prev + 4, filteredOffices.length))}>
                Load more results
              </button>
            )}
          </div>
        </div>

        <div className="map-container" ref={mapRef}>
          <div className="map-chip">Map: {filteredOffices.length} Locations</div>
          <button className="location-button-map" onClick={handleLocationClick} title="Zoom to my location">
            <svg className="location-icon" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </button>
        </div>

        <button className="view-toggle" onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}>
          {viewMode === 'list' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
              View Map
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              View List
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default App;