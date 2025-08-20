import React from 'react';
import './RegisteredVehicles.css';

const RegisteredVehicles = ({ vehicles, onRemoveVehicle }) => {
  return (
    <div className="dashboard-panel">
      <h3>Registered Vehicles ({vehicles.length})</h3>
      <div className="vehicles-list">
        {vehicles.length === 0 ? (
          <p className="no-vehicles">No vehicles registered</p>
        ) : (
          vehicles.map((vehicle, index) => (
            <div key={vehicle.phoneNumber} className="vehicle-item">
              <div className="vehicle-info">
                <div className="vehicle-id">{vehicle.vehicleId}</div>
                <div className="vehicle-phone">{vehicle.phoneNumber} | Status: SAFE</div>
              </div>
              <button 
                className="remove-btn"
                onClick={() => onRemoveVehicle(vehicle.phoneNumber)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RegisteredVehicles;