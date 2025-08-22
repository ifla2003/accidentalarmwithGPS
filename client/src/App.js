import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CollisionAlert from './components/CollisionAlert';
import Dashboard from './components/Dashboard';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [collisionAlert, setCollisionAlert] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    monitoring: 'Active',
    lastUpdate: new Date().toLocaleTimeString(),
    collisionThreshold: 3,
    warningThreshold: 5,
    maxRange: '0.6km / 10km max range'
  });

  useEffect(() => {
    // Listen for vehicle updates
    socket.on('vehicles-update', (vehicleList) => {
      setVehicles(vehicleList);
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString()
      }));
    });

    // Listen for collision alerts
    socket.on('collision-alert', (alert) => {
      setCollisionAlert(alert);
      setTimeout(() => setCollisionAlert(null), 10000);
    });

    // Request initial vehicle list
    socket.emit('get-vehicles');

    // Update time every second
    const timeInterval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString()
      }));
    }, 1000);

    return () => {
      socket.off('vehicles-update');
      socket.off('collision-alert');
      clearInterval(timeInterval);
    };
  }, []);

  const handleAddVehicle = (phoneNumber, vehicleId) => {
    socket.emit('register-vehicle', { phoneNumber, vehicleId });
    
    // Assign initial GPS position after a short delay to ensure vehicle is registered
    setTimeout(() => {
      // If this is the first vehicle, use a base location
      // Other vehicles will be positioned relative to the first one
      const isFirstVehicle = vehicles.length === 0;
      const baseLocation = { latitude: 40.7128, longitude: -74.0060 };
      
      const initialLocation = {
        phoneNumber: phoneNumber,
        latitude: isFirstVehicle ? baseLocation.latitude : baseLocation.latitude + (Math.random() - 0.5) * 0.01,
        longitude: isFirstVehicle ? baseLocation.longitude : baseLocation.longitude + (Math.random() - 0.5) * 0.01,
        accuracy: 5
      };
      handleLocationUpdate(initialLocation);
    }, 500);
  };

  const handleRemoveVehicle = (phoneNumber) => {
    socket.emit('remove-vehicle', { phoneNumber });
  };

  const handleLocationUpdate = (vehicleData) => {
    socket.emit('location-update', vehicleData);
  };

  const dismissAlert = () => {
    setCollisionAlert(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <span className="header-icon">🚗</span>
        <h1>Vehicle Collision Warning System</h1>
        <p>GPS-based proximity alarm for accident prevention</p>
      </header>
      
      <main className="App-main">
        <Dashboard 
          vehicles={vehicles}
          systemStatus={systemStatus}
          onAddVehicle={handleAddVehicle}
          onRemoveVehicle={handleRemoveVehicle}
          onLocationUpdate={handleLocationUpdate}
        />
        
        {collisionAlert && (
          <CollisionAlert 
            alert={collisionAlert} 
            onDismiss={dismissAlert}
          />
        )}
      </main>
    </div>
  );
}

export default App;
