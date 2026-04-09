import { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const cardRefs = useRef([]);
  const userMarkerRef = useRef(null);
  const popupRef = useRef(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 220);

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
    // Close popup if the currently highlighted office is filtered out
    if (highlightedIndex !== -1) {
      const highlightedOffice = offices[highlightedIndex];
      if (!filteredOffices.some(o => o.name === highlightedOffice.name)) {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        setHighlightedIndex(-1);
      }
    }
  }, [filteredOffices]);

  const visibleOffices = filteredOffices.slice(0, visibleCount);

  // Initialize MapCN (MapLibre GL)
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [10, 50],
      zoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      updateMarkers();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Ensure map is correctly sized when switching to map view on mobile
  useEffect(() => {
    if (viewMode === 'map' && mapRef.current) {
      setTimeout(() => {
        mapRef.current.resize();
      }, 50);
    }
  }, [viewMode]);

  const openOfficePopup = (office, globalIndex) => {
    if (!mapRef.current) return;

    // Remove existing popup if any
    if (popupRef.current) {
      popupRef.current.remove();
    }

    setHighlightedIndex(globalIndex);
    if (window.innerWidth <= 680) {
      setViewMode('map');
    }

    const popupHTML = `
      <div style="font-family: 'DM Sans', sans-serif; min-width: 220px;">
        <div style="background: #0A3161; color: white; padding: 12px; font-weight: bold; border-radius: 8px 8px 0 0; font-size: 14px;">
          ${office.name}
        </div>
        <div style="background: white; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
          <div style="margin-bottom: 10px;"><span style="color: #666; font-size: 11px; text-transform: uppercase; font-weight: bold; display: block;">Office Type</span><strong>${office.type}</strong></div>
          ${office.contacts.map(c => `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
              <span style="font-size: 13px;">${c.type === 'phone' ? '📞' : '✉️'}</span>
              <span style="font-size: 13px; color: #444;">${c.value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const newPopup = new maplibregl.Popup({ offset: 25, closeOnClick: false })
      .setLngLat([office.longitude, office.latitude])
      .setHTML(popupHTML)
      .addTo(mapRef.current);

    newPopup.on('close', () => {
      popupRef.current = null;
    });

    popupRef.current = newPopup;
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Remove existing markers that are not in the current filtered list
    Object.keys(markersRef.current).forEach(name => {
      if (!filteredOffices.some(o => o.name === name)) {
        markersRef.current[name].remove();
        delete markersRef.current[name];
      }
    });

    // Add or update markers
    filteredOffices.forEach((office) => {
      const globalIndex = offices.findIndex(o => o.name === office.name);
      const isActive = highlightedIndex === globalIndex;
      
      if (!markersRef.current[office.name]) {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        
        // Define marker styles based on office type
        const size = office.type === 'HQ' ? '24px' : '16px';
        const color = office.type === 'HQ' ? '#0A3161' : '#1A6B3C';
        
        el.innerHTML = `<div style="width: ${size}; height: ${size}; background: ${color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3); transition: all 0.3s ease;"></div>`;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([office.longitude, office.latitude])
          .addTo(mapRef.current);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openOfficePopup(office, globalIndex);
          cardRefs.current[globalIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        markersRef.current[office.name] = marker;
      }

      // Update active state style
      const markerEl = markersRef.current[office.name].getElement().firstChild;
      if (isActive) {
        markerEl.style.background = '#00A0DC';
        markerEl.style.boxShadow = '0 0 10px #00A0DC';
        markerEl.style.transform = 'scale(1.2)';
      } else {
        markerEl.style.background = office.type === 'HQ' ? '#0A3161' : '#1A6B3C';
        markerEl.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        markerEl.style.transform = 'scale(1)';
      }
    });
  };

  useEffect(() => {
    updateMarkers();
  }, [filteredOffices, highlightedIndex]);

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 12,
              essential: true
            });

            if (userMarkerRef.current) userMarkerRef.current.remove();

            const el = document.createElement('div');
            el.className = 'pulsing-user-marker';
            
            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([longitude, latitude])
              .addTo(mapRef.current);
            
            if (window.innerWidth <= 680) {
              setViewMode('map');
            }
          }
        },
        (error) => alert('Unable to retrieve location.')
      );
    }
  };

  const handleCardClick = (office, globalIndex) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [office.longitude, office.latitude],
        zoom: 14,
        speed: 1.2,
        curve: 1.1
      });
      openOfficePopup(office, globalIndex);
    }
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
            background: #F5F4F0;
          }

          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #0A3161;
            color: white;
            padding: 0 24px;
            z-index: 2000;
            font-family: 'DM Serif Display', serif;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          .main-container {
            display: flex;
            margin-top: 64px;
            height: calc(100vh - 64px);
            background-color: #F5F4F0;
          }

          .sidebar {
            width: 360px;
            background-color: #F5F4F0;
            overflow-y: auto;
            border-right: 1px solid rgba(0,0,0,0.08);
            z-index: 5;
          }

          .sticky-header {
            position: sticky;
            top: 0;
            background-color: #F5F4F0;
            padding: 24px;
            z-index: 10;
            backdrop-filter: blur(8px);
          }

          .search-input {
            width: 100%;
            padding: 14px 18px;
            margin-bottom: 20px;
            border: 1px solid #E0DED7;
            border-radius: 12px;
            font-size: 15px;
            background: white;
            box-sizing: border-box;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
            transition: all 0.2s;
          }
          
          .search-input:focus {
            outline: none;
            border-color: #0A3161;
            box-shadow: 0 0 0 3px rgba(10, 49, 97, 0.1);
          }

          .filter-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            overflow-x: auto;
          }

          .filter-button {
            padding: 10px 20px;
            border: 1px solid #E0DED7;
            background: white;
            cursor: pointer;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            transition: all 0.2s;
            white-space: nowrap;
            color: #555;
          }

          .filter-button.active {
            background: #0A3161;
            color: white;
            border-color: #0A3161;
          }

          .list-content {
            padding: 0 24px 100px 24px;
          }

          .office-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .office-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.06);
          }

          .office-card.highlighted {
            border-color: #00A0DC;
            background: #F0F9FF;
          }

          .office-name {
            font-weight: 700;
            margin-bottom: 10px;
            font-size: 17px;
            color: #0A3161;
            line-height: 1.3;
          }

          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }

          .hq { background-color: #0A3161; color: white; }
          .branch { background-color: #1A6B3C; color: white; }

          .map-container {
            flex: 1;
            height: 100%;
            position: relative;
            background: #E5E4DF;
          }

          .location-button {
            position: absolute;
            bottom: 32px;
            right: 32px;
            width: 52px;
            height: 52px;
            background: white;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            z-index: 1000;
            color: #0A3161;
            transition: all 0.2s;
          }

          .back-to-list-button {
            position: absolute;
            top: 20px;
            left: 20px;
            background: #0A3161;
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 13px;
            display: none;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            cursor: pointer;
          }

          .location-button:hover {
            background: #F0F7FF;
            transform: scale(1.05);
          }

          .pulsing-user-marker {
            width: 20px;
            height: 20px;
            background: #00A0DC;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 0 10px rgba(0,160,220,0.5);
            animation: pulse-ring 2s infinite;
          }

          @keyframes pulse-ring {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 160, 220, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 160, 220, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 160, 220, 0); }
          }

          /* Mobile View Switcher */
          @media (max-width: 680px) {
            .main-container {
              height: calc(100vh - 64px);
            }
            .sidebar {
              width: 100%;
              border-right: none;
              display: ${viewMode === 'list' ? 'block' : 'none'};
            }
            .map-container {
              width: 100%;
              height: 100%;
              display: ${viewMode === 'map' ? 'block' : 'none'};
            }
            .back-to-list-button {
              display: flex;
            }
          }

          .maplibregl-popup-content {
            padding: 0;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }
          .maplibregl-popup-close-button {
            top: 10px;
            right: 10px;
            color: white;
            font-size: 18px;
          }
        `}
      </style>

      <nav className="navbar">
        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>SC | Branch Locator</span>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{filteredOffices.length} Offices Found</span>
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
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>
              Showing {visibleOffices.length} of {filteredOffices.length} results
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                    {office.distance && (
                      <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>
                        {office.distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                  {office.contacts.length > 0 && (
                    <div style={{ marginTop: '15px', color: '#444' }}>
                      <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📞</span> {office.contacts[0].value}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {visibleCount < filteredOffices.length && (
              <button 
                onClick={() => setVisibleCount(prev => Math.min(prev + 4, filteredOffices.length))}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'white', 
                  border: '1px solid #ddd', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#0A3161'
                }}
              >
                Load more results
              </button>
            )}
          </div>
        </div>

        <div className="map-container" ref={mapContainer}>
          <button className="back-to-list-button" onClick={() => setViewMode('list')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to List
          </button>
          
          <button className="location-button" onClick={handleLocationClick} title="My Location">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default App;