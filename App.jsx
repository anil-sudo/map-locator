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

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=DM+Serif+Display&display=swap');

          body {
            font-family: 'DM Sans', sans-serif;
            margin: 0;
            padding: 0;
          }

          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #0A3161;
            color: white;
            padding: 15px 20px;
            z-index: 1000;
            font-family: 'DM Serif Display', serif;
            font-size: 1.2em;
            font-weight: 400;
          }

          .main-container {
            display: flex;
            margin-top: 60px;
            height: calc(100vh - 60px);
            background-color: #F5F4F0;
          }

          @media (max-width: 680px) {
            .main-container {
              flex-direction: column;
              height: auto;
            }
            .sidebar {
              width: 100% !important;
              height: 50vh;
            }
            .map-container {
              height: 50vh;
            }
          }

          .sidebar {
            width: 360px;
            background-color: #F5F4F0;
            padding: 20px;
            overflow-y: auto;
          }

          .map-container {
            flex: 1;
            background-color: #F5F4F0;
            height: 100%;
            position: relative;
          }

          .map-chip {
            position: absolute;
            top: 10px;
            left: 10px;
            background: white;
            padding: 8px 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-size: 0.9em;
            font-weight: 500;
            z-index: 1000;
          }

          .search-input {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1em;
            box-sizing: border-box;
          }

          .filter-buttons {
            margin-bottom: 15px;
          }

          .filter-button {
            padding: 8px 12px;
            margin-right: 8px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9em;
            transition: all 0.2s ease;
          }

          .filter-button.active {
            background: #0A3161;
            color: white;
            border-color: #0A3161;
          }

          .filter-button:hover {
            background: #f8f9fa;
            border-color: #0A3161;
          }

          .location-button-map {
            position: absolute;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            border: none;
            background: #00A0DC;
            color: white;
            cursor: pointer;
            border-radius: 6px;
            font-size: 0.9em;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
          }

          .result-count {
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #666;
          }

          .sort-label {
            margin-bottom: 10px;
            font-size: 0.85em;
            color: #0A3161;
            font-weight: 500;
          }

          .load-more {
            display: block;
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9em;
          }

          .pulsing-marker {
            width: 20px;
            height: 20px;
            background: teal;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }

          .office-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: pointer;
          }

          .office-card.highlighted {
            border-left: 4px solid #0A3161;
          }

          .office-name {
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 1.1em;
          }

          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 700;
            text-transform: uppercase;
          }

          .hq { background-color: #0A3161; color: white; }
          .branch { background-color: #28a745; color: white; }
        `}
      </style>
      <nav className="navbar">
        SC | Standard Chartered — Branch Locator Europe ({offices.length} offices)
      </nav>
      <div className="main-container">
        <div className="sidebar">
          <input
            type="text"
            className="search-input"
            placeholder="Search offices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-buttons">
            <button className={`filter-button ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-button ${filter === 'branch' ? 'active' : ''}`} onClick={() => setFilter('branch')}>Branch</button>
            <button className={`filter-button ${filter === 'hq' ? 'active' : ''}`} onClick={() => setFilter('hq')}>HQ</button>
          </div>
          <div className="result-count">Showing {visibleOffices.length} of {filteredOffices.length}</div>
          {userLocation && <div className="sort-label">Sorted by distance</div>}
          {visibleOffices.map((office, index) => {
            const globalIndex = offices.findIndex(o => o.name === office.name);
            return (
              <div key={index} ref={el => cardRefs.current[globalIndex] = el} className={`office-card ${highlightedIndex === globalIndex ? 'highlighted' : ''}`} onClick={() => {
                setHighlightedIndex(globalIndex);
                if (mapRef.current._map) {
                  mapRef.current._map.flyTo([office.latitude, office.longitude], 13);
                  markersRef.current[globalIndex].openPopup();
                }
              }}>
                <div className="office-name">{office.name}</div>
                <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                {office.contacts.length > 0 && (
                  <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#666' }}>
                    {office.contacts[0].type}: {office.contacts[0].value}
                  </div>
                )}
                {office.distance && <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#666' }}>{office.distance.toFixed(1)} km away</div>}
              </div>
            );
          })}
          {visibleCount < filteredOffices.length && (
            <button className="load-more" onClick={() => setVisibleCount(prev => Math.min(prev + 4, filteredOffices.length))}>
              Load more ({filteredOffices.length - visibleCount} remaining)
            </button>
          )}
        </div>
        <div className="map-container" ref={mapRef}>
          <div className="map-chip">Showing {filteredOffices.length} offices</div>
          <button className="location-button-map" onClick={handleLocationClick}>My Location</button>
        </div>
      </div>
    </>
  );
};

export default App;