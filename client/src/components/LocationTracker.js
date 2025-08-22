import React, { useState, useEffect } from 'react';
import './LocationTracker.css';

const LocationTracker = ({ onLocationUpdate, onTrackingChange, vehicles = [] }) => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [selectedPhone, setSelectedPhone] = useState('');

  useEffect(() => {
    onTrackingChange(isTracking);
  }, [isTracking, onTrackingChange]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000 // 1 second
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          phoneNumber: selectedPhone,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        };
        
        setLocation(newLocation);
        setError(null);
        
        // Only send location update if a vehicle is selected
        if (selectedPhone) {
          onLocationUpdate(newLocation);
        }
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        console.error('Geolocation error:', error);
      },
      options
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const requestPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setError(null);
    
    try {
      // Try to check permission status first
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        setError('❌ Location permission denied. Please enable location access in your browser settings and reload the page.');
        return;
      }
      
      if (permission.state === 'granted') {
        startTracking();
        return;
      }
      
      // If permission is 'prompt', the startTracking will trigger the permission request
      startTracking();
      
    } catch (err) {
      // Fallback for browsers that don't support permissions API
      console.log('Permission API not supported, trying direct geolocation access');
      startTracking();
    }
  };

  return (
    <div className="dashboard-panel location-tracker">
      <h3>📍 Real GPS Tracking</h3>
      
      <div className="vehicle-selection">
        <label htmlFor="vehicle-select">Select Vehicle to Track:</label>
        <select 
          id="vehicle-select"
          value={selectedPhone}
          onChange={(e) => setSelectedPhone(e.target.value)}
          disabled={isTracking}
        >
          <option value="">Choose a vehicle...</option>
          {vehicles.map(vehicle => (
            <option key={vehicle.phoneNumber} value={vehicle.phoneNumber}>
              {vehicle.vehicleId} ({vehicle.phoneNumber})
            </option>
          ))}
        </select>
      </div>

      <div className="tracking-controls">
        {!isTracking ? (
          <button 
            className="start-btn" 
            onClick={requestPermission}
            disabled={!selectedPhone}
          >
            {selectedPhone ? 'Start GPS Tracking' : 'Select Vehicle First'}
          </button>
        ) : (
          <button className="stop-btn" onClick={stopTracking}>
            Stop Tracking
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          {error.includes('denied') && (
            <div className="error-help">
              <strong>How to enable GPS permission:</strong>
              
              <div className="browser-instructions">
                <div className="browser-method">
                  <strong>Method 1 - Browser Settings:</strong>
                  <ol>
                    <li><strong>Chrome/Edge:</strong> Click address bar → Site settings → Location → Allow</li>
                    <li><strong>Firefox:</strong> Click address bar → Permissions → Location → Allow</li>
                    <li><strong>Safari:</strong> Safari menu → Settings → Websites → Location → Allow</li>
                  </ol>
                </div>
                
                <div className="browser-method">
                  <strong>Method 2 - Direct URL:</strong>
                  <ol>
                    <li>Copy this URL: <code>chrome://settings/content/location</code></li>
                    <li>Paste in address bar and press Enter</li>
                    <li>Add this site to "Allow" list</li>
                    <li>Reload this page</li>
                  </ol>
                </div>
                
                <div className="browser-method">
                  <strong>Method 3 - Manual:</strong>
                  <ol>
                    <li>Look for any icon near the address bar (🔒, ⓘ, 🛡️, or site info)</li>
                    <li>Click it and change Location to "Allow"</li>
                    <li>Reload the page</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isTracking && selectedPhone && (
        <div className="tracking-status">
          <div className="tracking-vehicle">
            <strong>Tracking: </strong>
            {vehicles.find(v => v.phoneNumber === selectedPhone)?.vehicleId || selectedPhone}
          </div>
        </div>
      )}

      {location && (
        <div className="location-info">
          <h4>Current GPS Location:</h4>
          <div className="location-details">
            <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> ±{location.accuracy.toFixed(1)}m</p>
            <p><strong>Last Update:</strong> {location.timestamp.toLocaleTimeString()}</p>
          </div>
        </div>
      )}

      <div className="safety-info">
        <h4>🛡️ GPS Tracking Features:</h4>
        <ul>
          <li>Real-time location updates</li>
          <li>High accuracy GPS positioning</li>
          <li>Automatic collision detection</li>
          <li>Live distance monitoring</li>
        </ul>
      </div>
    </div>
  );
};

export default LocationTracker;