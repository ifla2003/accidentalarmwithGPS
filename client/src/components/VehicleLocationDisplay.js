import React from 'react';
import './VehicleLocationDisplay.css';

const VehicleLocationDisplay = ({ vehicles }) => {
  const calculateDistance = (vehicle1, vehicle2) => {
    if (!vehicle1.currentLocation || !vehicle2.currentLocation) return null;
    
    const lat1 = vehicle1.currentLocation.latitude;
    const lng1 = vehicle1.currentLocation.longitude;
    const lat2 = vehicle2.currentLocation.latitude;
    const lng2 = vehicle2.currentLocation.longitude;
    
    // Haversine formula for distance calculation
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  const getVehicleStatus = (vehicle, allVehicles) => {
    if (!vehicle.currentLocation) return 'no-gps';
    
    let minDistance = Infinity;
    
    allVehicles.forEach(otherVehicle => {
      if (otherVehicle.phoneNumber !== vehicle.phoneNumber) {
        const distance = calculateDistance(vehicle, otherVehicle);
        if (distance && distance < minDistance) {
          minDistance = distance;
        }
      }
    });
    
    if (minDistance <= 3) return 'collision';
    if (minDistance <= 5) return 'warning';
    return 'safe';
  };

  const formatLocation = (location) => {
    if (!location) return 'No GPS Data';
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const formatTimestamp = (location) => {
    if (!location || !location.timestamp) return 'Never';
    return new Date(location.timestamp).toLocaleTimeString();
  };

  return (
    <div className="dashboard-panel vehicle-location-display">
      <h3>📍 Vehicle GPS Locations</h3>
      
      {vehicles.length === 0 ? (
        <div className="no-vehicles">
          <p>No vehicles registered</p>
        </div>
      ) : (
        <div className="locations-grid">
          {vehicles.map((vehicle) => {
            const status = getVehicleStatus(vehicle, vehicles);
            const hasLocation = vehicle.currentLocation && 
                               vehicle.currentLocation.latitude && 
                               vehicle.currentLocation.longitude;
            
            return (
              <div key={vehicle.phoneNumber} className={`location-card ${status}`}>
                <div className="vehicle-header">
                  <div className="vehicle-id">{vehicle.vehicleId}</div>
                  <div className={`status-badge ${status}`}>
                    {status === 'safe' && '🟢 SAFE'}
                    {status === 'warning' && '🟡 WARNING'}
                    {status === 'collision' && '🔴 DANGER'}
                    {status === 'no-gps' && '⚫ NO GPS'}
                  </div>
                </div>
                
                <div className="location-details">
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{vehicle.phoneNumber}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">GPS Coordinates:</span>
                    <span className="value location-coords">
                      {formatLocation(vehicle.currentLocation)}
                    </span>
                  </div>
                  
                  {hasLocation && (
                    <>
                      <div className="detail-row">
                        <span className="label">Accuracy:</span>
                        <span className="value">±{vehicle.currentLocation.accuracy?.toFixed(1) || 'N/A'}m</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Last Update:</span>
                        <span className="value">{formatTimestamp(vehicle.currentLocation)}</span>
                      </div>
                    </>
                  )}
                </div>
                
                {hasLocation && (
                  <div className="proximity-info">
                    <h5>Distance to Other Vehicles:</h5>
                    <div className="distances">
                      {vehicles
                        .filter(v => v.phoneNumber !== vehicle.phoneNumber)
                        .map(otherVehicle => {
                          const distance = calculateDistance(vehicle, otherVehicle);
                          return (
                            <div key={otherVehicle.phoneNumber} className="distance-item">
                              <span className="other-vehicle">{otherVehicle.vehicleId}:</span>
                              <span className={`distance ${distance <= 3 ? 'danger' : distance <= 5 ? 'warning' : 'safe'}`}>
                                {distance ? `${distance.toFixed(1)}m` : 'No GPS'}
                              </span>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="legend">
        <h4>Status Legend:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot safe"></span>
            <span>Safe Distance (&gt;5m)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot warning"></span>
            <span>Warning Zone (3-5m)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot collision"></span>
            <span>Collision Risk (&lt;3m)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot no-gps"></span>
            <span>No GPS Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleLocationDisplay;
