import React from "react";
import "./VehicleMap.css";

const calculateRealDistance = (vehicle1, vehicle2) => {
  if (!vehicle1.currentLocation || !vehicle2.currentLocation) return Infinity;

  const lat1 = vehicle1.currentLocation.latitude;
  const lng1 = vehicle1.currentLocation.longitude;
  const lat2 = vehicle2.currentLocation.latitude;
  const lng2 = vehicle2.currentLocation.longitude;

  // Haversine formula for distance calculation
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

const VehicleMap = ({ vehicles }) => {
  const getVehicleStatus = (vehicle) => {
    if (
      !vehicle.currentLocation ||
      !vehicle.currentLocation.latitude ||
      !vehicle.currentLocation.longitude
    ) {
      return { status: "no-gps", minDistance: null };
    }

    let status = "safe";
    let minDistance = Infinity;

    vehicles.forEach((otherVehicle) => {
      if (otherVehicle.phoneNumber !== vehicle.phoneNumber) {
        const distance = calculateRealDistance(vehicle, otherVehicle);
        if (distance < minDistance) {
          minDistance = distance;
        }

        if (distance <= 3) {
          // 3 meter - collision risk
          status = "collision";
        } else if (distance <= 5 && status !== "collision") {
          // 5 meters - warning zone
          status = "warning";
        }
      }
    });

    return {
      status,
      minDistance: minDistance === Infinity ? null : minDistance,
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "collision":
        return "#e17055";
      case "warning":
        return "#fdcb6e";
      case "safe":
        return "#00b894";
      case "no-gps":
        return "#95a5a6";
      default:
        return "#95a5a6";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "collision":
        return "COLLISION RISK";
      case "warning":
        return "WARNING ZONE";
      case "safe":
        return "SAFE";
      case "no-gps":
        return "NO GPS";
      default:
        return "UNKNOWN";
    }
  };

  return (
    <div className="dashboard-panel vehicle-positions-panel">
      <h3>📍 Vehicle Positions - Live</h3>
      <div className="positions-container">
        {vehicles.length === 0 ? (
          <div className="no-vehicles">
            <p>No vehicles registered yet.</p>
            <p>Add vehicles using the registration form above.</p>
          </div>
        ) : (
          <div className="vehicle-list">
            {vehicles.map((vehicle) => {
              const { status, minDistance } = getVehicleStatus(vehicle);
              return (
                <div
                  key={vehicle.phoneNumber}
                  className={`vehicle-item ${status}`}
                >
                  <div className="vehicle-header">
                    <div
                      className="vehicle-icon"
                      style={{ backgroundColor: getStatusColor(status) }}
                    >
                      {vehicle.vehicleId.slice(-1)}
                    </div>
                    <div className="vehicle-info">
                      <h4>{vehicle.vehicleId}</h4>
                      <p className="phone-number">{vehicle.phoneNumber}</p>
                    </div>
                    <div className="vehicle-status">
                      <span className={`status-badge ${status}`}>
                        {getStatusText(status)}
                      </span>
                    </div>
                  </div>

                  <div className="vehicle-details">
                    {vehicle.currentLocation &&
                    vehicle.currentLocation.latitude ? (
                      <>
                        <div className="detail-row">
                          <span className="label">GPS Coordinates:</span>
                          <span className="value">
                            {vehicle.currentLocation.latitude.toFixed(6)},{" "}
                            {vehicle.currentLocation.longitude.toFixed(6)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Accuracy:</span>
                          <span className="value">
                            ±{vehicle.currentLocation.accuracy || "N/A"}m
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Nearest Vehicle:</span>
                          <span className="value">
                            {minDistance ? `${minDistance.toFixed(1)}m` : "N/A"}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Last Update:</span>
                          <span className="value">
                            {new Date(
                              vehicle.lastUpdate ||
                                vehicle.currentLocation.timestamp
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="no-gps-message">
                        <p>📍 No GPS data available</p>
                        <p>Enable GPS and start monitoring to see location</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="positions-legend">
          <div className="legend-item">
            <div className="legend-dot safe"></div>
            <span>Safe Distance (&gt;5m)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot warning"></div>
            <span>Warning Zone (3-5m)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot collision"></div>
            <span>Collision Risk (&lt;3m)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot no-gps"></div>
            <span>No GPS Data</span>
          </div>
        </div>

        <div className="positions-info">
          <p>
            📍 Showing{" "}
            {vehicles.filter((v) => v.currentLocation?.latitude).length} of{" "}
            {vehicles.length} vehicles with GPS data
          </p>
          <p>🔄 Updates automatically when vehicles move</p>
        </div>
      </div>
    </div>
  );
};

export default VehicleMap;
