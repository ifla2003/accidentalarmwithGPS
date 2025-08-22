import React from "react";
import VehicleRegistration from "./VehicleRegistration";
import RegisteredVehicles from "./RegisteredVehicles";
import GPSSimulation from "./GPSSimulation";
import SystemStatus from "./SystemStatus";
import LocationTracker from "./LocationTracker";
import VehicleLocationDisplay from "./VehicleLocationDisplay";
import "./Dashboard.css";

const Dashboard = ({
  vehicles,
  systemStatus,
  onAddVehicle,
  onRemoveVehicle,
  onLocationUpdate,
}) => {
  const handleTrackingChange = (isTracking) => {
    // Handle tracking state change if needed
    console.log('GPS Tracking:', isTracking ? 'Started' : 'Stopped');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row">
        <VehicleRegistration onAddVehicle={onAddVehicle} />
        <RegisteredVehicles
          vehicles={vehicles}
          onRemoveVehicle={onRemoveVehicle}
        />
        <GPSSimulation
          vehicles={vehicles}
          onLocationUpdate={onLocationUpdate}
        />
      </div>

      <div className="dashboard-row">
        <SystemStatus status={systemStatus} />
        <LocationTracker 
          vehicles={vehicles}
          onLocationUpdate={onLocationUpdate}
          onTrackingChange={handleTrackingChange}
        />
      </div>

      <div className="dashboard-row">
        <VehicleLocationDisplay vehicles={vehicles} />
      </div>
    </div>
  );
};

export default Dashboard;
