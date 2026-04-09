import React, { useState, useEffect } from 'react';

const App = () => {
  const offices = [
    { name: "London HQ", type: "HQ" },
    { name: "Paris Branch", type: "Branch" },
    { name: "Berlin Branch", type: "Branch" },
    { name: "Amsterdam Branch", type: "Branch" },
    { name: "Zurich Branch", type: "Branch" },
    { name: "Milan Branch", type: "Branch" },
    { name: "Madrid Branch", type: "Branch" },
    { name: "Vienna Branch", type: "Branch" },
    { name: "Brussels Branch", type: "Branch" },
    { name: "Copenhagen Branch", type: "Branch" }
  ];

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

  const searchedOffices = offices.filter(office =>
    office.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const filteredOffices = searchedOffices.filter(office =>
    filter === 'all' || office.type.toLowerCase() === filter
  );

  useEffect(() => {
    setVisibleCount(4);
  }, [filteredOffices]);

  const visibleOffices = filteredOffices.slice(0, visibleCount);

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
          <div className="result-count">Showing {visibleOffices.length} of {offices.length}</div>
          {visibleOffices.map((office, index) => (
            <div key={index} className="office-card">
              <div className="office-name">{office.name}</div>
              <span className={`badge ${office.type.toLowerCase()}`}>{office.type}</span>
            </div>
          ))}
          {visibleCount < filteredOffices.length && (
            <button className="load-more" onClick={() => setVisibleCount(prev => Math.min(prev + 4, filteredOffices.length))}>
              Load more ({filteredOffices.length - visibleCount} remaining)
            </button>
          )}
        </div>
        <div className="map-container">
          {/* Right panel content */}
        </div>
      </div>
    </>
  );
};

export default App;