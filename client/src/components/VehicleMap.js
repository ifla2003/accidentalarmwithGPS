import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './VehicleMap.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icons
const createVehicleIcon = (status, vehicleId) => {
  let color = '#00b894'; // Green for safe
  if (status === 'warning') color = '#fdcb6e'; // Yellow
  if (status === 'collision') color = '#e17055'; // Red
  if (status === 'no-gps') color = '#95a5a6'; // Gray

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="vehicle-marker-icon ${status}" style="background-color: ${color};">
        <span class="vehicle-id">${vehicleId.slice(-1)}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const calculateRealDistance = (vehicle1, vehicle2) => {
  if (!vehicle1.currentLocation || !vehicle2.currentLocation) return Infinity;
  
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

// Component to auto-fit map bounds to show all vehicles
const MapBounds = ({ vehicles }) => {
  const map = useMap();
  
  useEffect(() => {
    if (vehicles.length > 0) {
      const validVehicles = vehicles.filter(v => 
        v.currentLocation && v.currentLocation.latitude && v.currentLocation.longitude
      );
      
      if (validVehicles.length > 0) {
        const bounds = L.latLngBounds(
          validVehicles.map(v => [v.currentLocation.latitude, v.currentLocation.longitude])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [vehicles, map]);
  
  return null;
};

const VehicleMap = ({ vehicles }) => {
  // Default center (NYC) if no vehicles
  const defaultCenter = [40.7128, -74.0060];
  
  // Get center from first vehicle with location or use default
  const mapCenter = vehicles.find(v => v.currentLocation?.latitude && v.currentLocation?.longitude)
    ? [vehicles.find(v => v.currentLocation?.latitude && v.currentLocation?.longitude).currentLocation.latitude,
       vehicles.find(v => v.currentLocation?.latitude && v.currentLocation?.longitude).currentLocation.longitude]
    : defaultCenter;

  const renderVehicleMarkers = () => {
    const markers = [];
    
    vehicles.forEach((vehicle) => {
      // Skip vehicles without location data
      if (!vehicle.currentLocation || !vehicle.currentLocation.latitude || !vehicle.currentLocation.longitude) {
        return;
      }

      // Determine status based on real distance to other vehicles
      let status = 'safe';
      let minDistance = Infinity;
      
      vehicles.forEach((otherVehicle) => {
        if (otherVehicle.phoneNumber !== vehicle.phoneNumber) {
          const distance = calculateRealDistance(vehicle, otherVehicle);
          if (distance < minDistance) {
            minDistance = distance;
          }
          
          if (distance <= 3) { // 3 meter - collision risk
            status = 'collision';
          } else if (distance <= 5 && status !== 'collision') { // 5 meters - warning zone
            status = 'warning';
          }
        }
      });
      
      const position = [vehicle.currentLocation.latitude, vehicle.currentLocation.longitude];
      const icon = createVehicleIcon(status, vehicle.vehicleId);
      
      // Add warning/collision radius circles
      if (status === 'warning' || status === 'collision') {
        markers.push(
          <Circle
            key={`${vehicle.phoneNumber}-radius`}
            center={position}
            radius={status === 'collision' ? 3 : 5}
            pathOptions={{
              color: status === 'collision' ? '#e17055' : '#fdcb6e',
              fillColor: status === 'collision' ? '#e17055' : '#fdcb6e',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
        );
      }
      
      markers.push(
        <Marker
          key={vehicle.phoneNumber}
          position={position}
          icon={icon}
        >
          <Popup>
            <div className="vehicle-popup">
              <h4>🚗 {vehicle.vehicleId}</h4>
              <p><strong>Phone:</strong> {vehicle.phoneNumber}</p>
              <p><strong>Status:</strong> <span className={`status-${status}`}>{status.toUpperCase()}</span></p>
              <p><strong>GPS:</strong> {vehicle.currentLocation.latitude.toFixed(6)}, {vehicle.currentLocation.longitude.toFixed(6)}</p>
              <p><strong>Accuracy:</strong> ±{vehicle.currentLocation.accuracy || 'N/A'}m</p>
              <p><strong>Nearest Vehicle:</strong> {minDistance === Infinity ? 'N/A' : `${minDistance.toFixed(1)}m`}</p>
              <p><strong>Last Update:</strong> {new Date(vehicle.lastUpdate || vehicle.currentLocation.timestamp).toLocaleTimeString()}</p>
            </div>
          </Popup>
        </Marker>
      );
    });
    
    return markers;
  };

  return (
    <div className="dashboard-panel vehicle-map-panel">
      <h3>🗺️ Vehicle Positions - Live Map</h3>
      <div className="map-container">
        <div className="leaflet-map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '400px', width: '100%' }}
            className="vehicle-leaflet-map"
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBounds vehicles={vehicles} />
            {renderVehicleMarkers()}
          </MapContainer>
        </div>
        
        <div className="map-legend">
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
        </div>
        
        <div className="map-info">
          <p>📍 Showing {vehicles.filter(v => v.currentLocation?.latitude).length} of {vehicles.length} vehicles with GPS data</p>
          <p>🌍 Using OpenStreetMap - Click markers for details</p>
        </div>
      </div>
    </div>
  );
};

export default VehicleMap;