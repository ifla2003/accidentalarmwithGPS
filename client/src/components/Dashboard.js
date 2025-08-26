import React from "react";

import RegisteredVehicles from "./RegisteredVehicles";
import GPSSimulation from "./GPSSimulation";
import SystemStatus from "./SystemStatus";
import VehicleMap from "./VehicleMap";
import "./Dashboard.css";

const Dashboard = ({
  vehicles,
  systemStatus,
  currentUser,
  onAddVehicle,
  onRemoveVehicle,
  onLocationUpdate,
}) => {
  return (
    <div className="dashboard">
      <div className="dashboard-row">
        <RegisteredVehicles
          vehicles={vehicles}
          onRemoveVehicle={onRemoveVehicle}
        />
        <GPSSimulation
          vehicles={vehicles}
          currentUser={currentUser}
          onLocationUpdate={onLocationUpdate}
        />
      </div>

      <div className="dashboard-row">
        <SystemStatus status={systemStatus} />
        <VehicleMap vehicles={vehicles} />
      </div>
    </div>
  );
};

export default Dashboard;
