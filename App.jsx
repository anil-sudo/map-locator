import React from 'react';

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

  return (
    <>
      <style>
        {`
          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #F5F4F0;
            padding: 10px;
            z-index: 1000;
            font-weight: bold;
          }
          .main-container {
            display: flex;
            margin-top: 50px; /* Adjust based on navbar height */
            height: calc(100vh - 50px);
            background-color: #F5F4F0;
          }
          .sidebar {
            width: 360px;
            background-color: #F5F4F0;
            padding: 10px;
            overflow-y: auto;
          }
          .map-container {
            flex: 1;
            background-color: #F5F4F0;
          }
          .office-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .office-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .office-type {
            color: #666;
            font-size: 0.9em;
          }
        `}
      </style>
      <nav className="navbar">
        SC | Standard Chartered — Branch Locator Europe
      </nav>
      <div className="main-container">
        <div className="sidebar">
          {offices.map((office, index) => (
            <div key={index} className="office-card">
              <div className="office-name">{office.name}</div>
              <div className="office-type">{office.type}</div>
            </div>
          ))}
        </div>
        <div className="map-container">
          {/* Right panel content */}
        </div>
      </div>
    </>
  );
};

export default App;