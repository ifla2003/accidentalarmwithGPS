import React, { useState, useEffect } from "react";
import "./LocationTrackingControl.css";

const LocationTrackingControl = ({
  currentUser,
  vehicles,
  onToggleLocationTracking,
  gpsStatus,
  onStartGPS,
  onStartSimulated,
}) => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Find current user's vehicle data
  const currentVehicle = vehicles.find(
    (v) => v.phoneNumber === currentUser?.phoneNumber
  );

  useEffect(() => {
    if (currentVehicle) {
      setIsLocationEnabled(currentVehicle.locationTrackingEnabled || false);
    }
  }, [currentVehicle]);

  const handleToggleLocationTracking = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      const newState = !isLocationEnabled;

      // Update the server
      await onToggleLocationTracking(currentUser.phoneNumber, newState);

      if (newState) {
        // If enabling location tracking, start GPS
        if (gpsStatus === "inactive" || gpsStatus === "error") {
          onStartGPS();
        }
      }

      setIsLocationEnabled(newState);
    } catch (error) {
      console.error("Failed to toggle location tracking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationStatus = () => {
    if (!isLocationEnabled) return "disabled";
    if (gpsStatus === "searching") return "searching";
    if (gpsStatus === "active") return "active";
    if (gpsStatus === "error") return "error";
    return "inactive";
  };

  const getStatusText = () => {
    const status = getLocationStatus();
    switch (status) {
      case "disabled":
        return "Location Tracking Disabled";
      case "searching":
        return "Getting GPS Location...";
      case "active":
        return "Location Tracking Active";
      case "error":
        return "GPS Error - Try Again";
      case "inactive":
        return "Location Tracking Enabled (GPS Inactive)";
      default:
        return "Unknown Status";
    }
  };

  const getStatusIcon = () => {
    const status = getLocationStatus();
    switch (status) {
      case "disabled":
        return "📍";
      case "searching":
        return "🔍";
      case "active":
        return "✅";
      case "error":
        return "❌";
      case "inactive":
        return "⏸️";
      default:
        return "📍";
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="location-tracking-control">
      <div className="control-header">
        <h3>📍 Location Tracking</h3>
        <div className={`status-indicator ${getLocationStatus()}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      <div className="control-content">
        <div className="vehicle-info">
          <p>
            <strong>Your Vehicle:</strong> {currentUser.vehicleId}
          </p>
          <p>
            <strong>Phone:</strong> {currentUser.phoneNumber}
          </p>
        </div>

        <div className="control-buttons">
          <button
            onClick={handleToggleLocationTracking}
            disabled={isLoading}
            className={`toggle-btn ${
              isLocationEnabled ? "enabled" : "disabled"
            }`}
          >
            {isLoading ? (
              <span className="loading">⏳ Updating...</span>
            ) : (
              <>
                {isLocationEnabled ? "🛑 Disable" : "📍 Enable"} Location
                Tracking
              </>
            )}
          </button>

          {isLocationEnabled &&
            (gpsStatus === "inactive" || gpsStatus === "error") && (
              <div className="gps-controls">
                <button
                  onClick={onStartGPS}
                  className="gps-btn"
                  disabled={gpsStatus === "searching"}
                >
                  {gpsStatus === "searching"
                    ? "🔍 Getting GPS..."
                    : "📡 Start GPS"}
                </button>
                <button onClick={onStartSimulated} className="sim-btn">
                  📍 Use Demo Location
                </button>
              </div>
            )}
        </div>

        {isLocationEnabled && currentVehicle?.currentLocation && (
          <div className="current-location">
            <h4>Current Location</h4>
            <div className="location-details">
              <p>
                <strong>Latitude:</strong>{" "}
                {currentVehicle.currentLocation.latitude?.toFixed(6) || 'N/A'}
              </p>
              <p>
                <strong>Longitude:</strong>{" "}
                {currentVehicle.currentLocation.longitude?.toFixed(6) || 'N/A'}
              </p>
              <p>
                <strong>Accuracy:</strong> ±
                {currentVehicle.currentLocation.accuracy || 5}m
              </p>
              <p>
                <strong>Last Update:</strong>{" "}
                {new Date(
                  currentVehicle.currentLocation.timestamp
                ).toLocaleString()}
              </p>
              {currentVehicle.currentLocation.isSimulated && (
                <p className="simulated-badge">📍 Simulated Location</p>
              )}
            </div>
          </div>
        )}

        <div className="tracking-info">
          <h4>ℹ️ About Location Tracking</h4>
          <ul>
            <li>Enable location tracking to appear on the vehicle map</li>
            <li>
              Your location is shared with other users for collision detection
            </li>
            <li>Location data is updated in real-time when GPS is active</li>
            <li>You can disable tracking at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LocationTrackingControl;
