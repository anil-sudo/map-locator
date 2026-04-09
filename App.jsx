import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const offices = [
    { name: "London HQ", type: "HQ", lat: 51.5074, lng: -0.1278, contacts: { address: "1 London Wall, London EC2Y 5AB", phone: "+44 20 1234 5678", email: "london@sc.com" } },
    { name: "Paris Branch", type: "Branch", lat: 48.8566, lng: 2.3522, contacts: { address: "10 Place Vendôme, 75001 Paris", phone: "+33 1 42 86 00 00", email: "paris@sc.com" } },
    { name: "Berlin Branch", type: "Branch", lat: 52.5200, lng: 13.4050, contacts: { address: "Unter den Linden 1, 10117 Berlin", phone: "+49 30 12345678", email: "berlin@sc.com" } },
    { name: "Amsterdam Branch", type: "Branch", lat: 52.3676, lng: 4.9041, contacts: { address: "Beursplein 5, 1012 JW Amsterdam", phone: "+31 20 123 4567", email: "amsterdam@sc.com" } },
    { name: "Zurich Branch", type: "Branch", lat: 47.3769, lng: 8.5417, contacts: { address: "Bahnhofstrasse 1, 8001 Zurich", phone: "+41 44 123 45 67", email: "zurich@sc.com" } },
    { name: "Milan Branch", type: "Branch", lat: 45.4642, lng: 9.1900, contacts: { address: "Piazza Duomo, 20122 Milano", phone: "+39 02 1234 5678", email: "milan@sc.com" } },
    { name: "Madrid Branch", type: "Branch", lat: 40.4168, lng: -3.7038, contacts: { address: "Paseo de la Castellana 1, 28046 Madrid", phone: "+34 91 123 45 67", email: "madrid@sc.com" } },
    { name: "Vienna Branch", type: "Branch", lat: 48.2082, lng: 16.3738, contacts: { address: "Am Hof 1, 1010 Vienna", phone: "+43 1 12345678", email: "vienna@sc.com" } },
    { name: "Brussels Branch", type: "Branch", lat: 50.8503, lng: 4.3517, contacts: { address: "Rue de la Loi 1, 1040 Brussels", phone: "+32 2 123 45 67", email: "brussels@sc.com" } },
    { name: "Copenhagen Branch", type: "Branch", lat: 55.6761, lng: 12.5683, contacts: { address: "Kongens Nytorv 1, 1050 Copenhagen", phone: "+45 33 12 34 56", email: "copenhagen@sc.com" } }
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

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 220);

  const [filter, setFilter] = useState('all');

  const [visibleCount, setVisibleCount] = useState(4);

  const officesWithDistance = userLocation ? offices.map(office => ({
    ...office,
    distance: haversineDistance(userLocation.lat, userLocation.lng, office.lat, office.lng)
  })) : offices;

  const searchedOffices = officesWithDistance.filter(office =>
    office.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const filteredOffices = searchedOffices.filter(office =>
    filter === 'all' || office.type.toLowerCase() === filter
  ).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

  useEffect(() => {
    setVisibleCount(4);
  }, [filteredOffices]);

  const visibleOffices = filteredOffices.slice(0, visibleCount);

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapRef.current._map) {
            mapRef.current._map.flyTo([latitude, longitude], 13);
          }
          // Add user marker
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

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cardRefs = useRef([]);
  const [userLocation, setUserLocation] = useState(null);
  const userMarkerRef = useRef(null);

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

  const isLeafletLoaded = useLeaflet();
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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
        const marker = window.L.marker([office.lat, office.lng], { icon }).addTo(map);
        
        const popupContent = `
          <div style="font-family: 'DM Sans', sans-serif; min-width: 250px; font-size: 14px;">
            <div style="background: #0A3161; color: white; padding: 10px; font-weight: bold; border-radius: 6px 6px 0 0; font-size: 16px;">
              ${office.name}
            </div>
            <div style="background: white; padding: 12px; border-radius: 0 0 6px 6px; line-height: 1.4;">
              <div style="margin-bottom: 8px;"><strong>Type:</strong> ${office.type}</div>
              <div style="margin-bottom: 8px;"><strong>Address:</strong> ${office.contacts.address}</div>
              <div style="margin-bottom: 8px;"><strong>Phone:</strong> ${office.contacts.phone}</div>
              <div><strong>Email:</strong> ${office.contacts.email}</div>
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
            margin-top: 60px; /* Adjusted for navbar height */
            height: calc(100vh - 60px);
            background-color: #F5F4F0;
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
          }

          .filter-button.active {
            background: #0A3161;
            color: white;
            border-color: #0A3161;
          }

          .location-button {
            display: block;
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            background: #28a745;
            color: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.9em;
          }

          .location-button:hover {
            background: #218838;
          }

          .result-count {
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #666;
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

          .custom-marker {
            background: none;
            border: none;
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

          .office-distance {
            margin-top: 5px;
            font-size: 0.85em;
            color: #666;
          }

          .office-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
          }

          .office-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          }

          .office-card.highlighted {
            border: 2px solid #0A3161;
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
            letter-spacing: 0.5px;
          }

          .hq {
            background-color: #0A3161;
            color: white;
          }

          .branch {
            background-color: #28a745;
            color: white;
          }
        `}
      </style>
      <nav className="navbar">
        SC | Standard Chartered — Branch Locator Europe
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
          <button className="location-button" onClick={handleLocationClick}>My Location</button>
          <div className="result-count">Showing {visibleOffices.length} of {offices.length}</div>
          {visibleOffices.map((office, index) => {
            const globalIndex = offices.findIndex(o => o.name === office.name);
            return (
              <div key={index} ref={el => cardRefs.current[globalIndex] = el} className={`office-card ${highlightedIndex === globalIndex ? 'highlighted' : ''}`} onClick={() => {
                setHighlightedIndex(globalIndex);
                if (mapRef.current._map) {
                  mapRef.current._map.flyTo([office.lat, office.lng], 13);
                  markersRef.current[globalIndex].openPopup();
                }
              }}>
                <div className="office-name">{office.name}</div>
                <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
                {office.distance && <div className="office-distance">{office.distance.toFixed(1)} km away</div>}
              </div>
            );
          })}
          {visibleCount < filteredOffices.length && (
            <button className="load-more" onClick={() => setVisibleCount(prev => Math.min(prev + 4, filteredOffices.length))}>
              Load more ({filteredOffices.length - visibleCount} remaining)
            </button>
          )}
        </div>
        <div className="map-container" ref={mapRef}></div>
      </div>
    </>
  );
};

export default App;