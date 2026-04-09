import React from 'react';

const App = () => {
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
          }
          .map-container {
            flex: 1;
            background-color: #F5F4F0;
          }
        `}
      </style>
      <nav className="navbar">
        SC | Standard Chartered — Branch Locator Europe
      </nav>
      <div className="main-container">
        <div className="sidebar">
          {/* Left panel content */}
        </div>
        <div className="map-container">
          {/* Right panel content */}
        </div>
      </div>
    </>
  );
};

export default App;