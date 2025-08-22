import React, { useState } from "react";
import "./GPSSimulation.css";

const GPSSimulation = ({ vehicles, onLocationUpdate }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [simulationData, setSimulationData] = useState({});

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    // Start GPS monitoring for all vehicles
    vehicles.forEach((vehicle) => {
      startGPSTracking(vehicle);
    });
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    // Stop all GPS tracking
    Object.values(simulationData).forEach(({ watchId }) => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    });
    setSimulationData({});
  };

  const startGPSTracking = async (vehicle) => {
    if (!navigator.geolocation) {
      alert("GPS not supported on this device/browser. Use simulation buttons instead.");
      return;
    }

    try {
      // Check permission status first
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        alert("❌ GPS Permission Denied!\n\nTo enable GPS tracking:\n1. Click the location icon in your browser's address bar\n2. Select 'Allow' for location access\n3. Reload the page and try again\n\nAlternatively, use the simulation buttons below for testing.");
        return;
      }
    } catch (err) {
      // Permission API not supported, continue with geolocation attempt
      console.log('Permission API not supported, trying direct GPS access');
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          phoneNumber: vehicle.phoneNumber,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        onLocationUpdate(locationData);
      },
      (error) => {
        console.error("GPS Error:", error);
        let errorMessage = "GPS Error: ";
        let instructions = "";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied.";
            instructions = "\n\n🔧 How to fix:\n1. Click the location/lock icon in your browser address bar\n2. Change location permission to 'Allow'\n3. Reload the page\n4. Try again\n\n💡 Or use simulation buttons for testing!";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "GPS location unavailable.";
            instructions = "\n\n🔧 How to fix:\n1. Check if GPS is enabled on your device\n2. Try moving to an area with better GPS signal\n3. Use simulation buttons for indoor testing";
            break;
          case error.TIMEOUT:
            errorMessage += "GPS request timed out.";
            instructions = "\n\n🔧 Try:\n1. Check your GPS signal\n2. Try again in a few seconds\n3. Use simulation buttons for testing";
            break;
          default:
            errorMessage += "Unknown GPS error occurred.";
            instructions = "\n\n💡 Use simulation buttons for testing!";
            break;
        }
        alert(errorMessage + instructions);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 1000, 
        timeout: 15000  // Increased timeout
      }
    );

    setSimulationData((prev) => ({
      ...prev,
      [vehicle.phoneNumber]: { watchId },
    }));
  };

  const simulateNearCollision = () => {
    if (vehicles.length >= 2) {
      // Use first vehicle's current location as base, or default if no location
      const firstVehicle = vehicles[0];
      const baseLocation = firstVehicle.currentLocation
        ? {
            latitude: firstVehicle.currentLocation.latitude,
            longitude: firstVehicle.currentLocation.longitude,
          }
        : {
            latitude: 40.7128,
            longitude: -74.006,
          };

      // Place vehicles relative to the first vehicle (base location)
      vehicles.forEach((vehicle, index) => {
        let locationData;
        if (index === 0) {
          // First vehicle stays at base location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude,
            longitude: baseLocation.longitude,
            accuracy: 5,
          };
        } else if (index === 1) {
          // Second vehicle very close to first (within 3 meters for collision)
          // Using more precise GPS coordinates for 2.5 meter separation
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + 0.0000225, // ~2.5 meters from base
            longitude: baseLocation.longitude + 0.0000225, // ~2.5 meters from base
            accuracy: 5,
          };
        } else {
          // Other vehicles spread out from base location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + index * 0.0001,
            longitude: baseLocation.longitude + index * 0.0001,
            accuracy: 5,
          };
        }
        onLocationUpdate(locationData);
      });
    }
  };

  const simulateExactCollision = () => {
    if (vehicles.length >= 2) {
      // Use first vehicle's current location as base, or default if no location
      const firstVehicle = vehicles[0];
      const baseLocation = firstVehicle.currentLocation
        ? {
            latitude: firstVehicle.currentLocation.latitude,
            longitude: firstVehicle.currentLocation.longitude,
          }
        : {
            latitude: 40.7128,
            longitude: -74.006,
          };

      // Place first two vehicles at exactly the same location (0.0 meters apart)
      vehicles.forEach((vehicle, index) => {
        let locationData;
        if (index === 0 || index === 1) {
          // First two vehicles at exact same location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude,
            longitude: baseLocation.longitude,
            accuracy: 5,
          };
        } else {
          // Other vehicles spread out from base location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + index * 0.0001,
            longitude: baseLocation.longitude + index * 0.0001,
            accuracy: 5,
          };
        }
        onLocationUpdate(locationData);
      });
    }
  };

  const resetPositions = () => {
    if (vehicles.length === 0) return;

    // Use first vehicle's current location as base, or default if no location
    const firstVehicle = vehicles[0];
    const baseLocation = firstVehicle.currentLocation
      ? {
          latitude: firstVehicle.currentLocation.latitude,
          longitude: firstVehicle.currentLocation.longitude,
        }
      : {
          latitude: 40.7128,
          longitude: -74.006,
        };

    vehicles.forEach((vehicle, index) => {
      const locationData = {
        phoneNumber: vehicle.phoneNumber,
        latitude: baseLocation.latitude + index * 0.001, // Spread out from base
        longitude: baseLocation.longitude + index * 0.001,
        accuracy: 5,
      };
      onLocationUpdate(locationData);
    });
  };

  const assignRandomPositions = () => {
    if (vehicles.length === 0) {
      alert("Please register some vehicles first!");
      return;
    }

    // Use first vehicle's current location as base, or default if no location
    const firstVehicle = vehicles[0];
    const baseLocation = firstVehicle.currentLocation
      ? {
          latitude: firstVehicle.currentLocation.latitude,
          longitude: firstVehicle.currentLocation.longitude,
        }
      : {
          latitude: 40.7128,
          longitude: -74.006,
        };

    vehicles.forEach((vehicle, index) => {
      const locationData = {
        phoneNumber: vehicle.phoneNumber,
        latitude:
          index === 0
            ? baseLocation.latitude
            : baseLocation.latitude + (Math.random() - 0.5) * 0.01,
        longitude:
          index === 0
            ? baseLocation.longitude
            : baseLocation.longitude + (Math.random() - 0.5) * 0.01,
        accuracy: 5,
      };
      onLocationUpdate(locationData);
    });
  };

  const clearStorage = () => {
    setSimulationData({});
    localStorage.clear();
  };

  const showDistances = () => {
    if (vehicles.length < 2) {
      alert("Need at least 2 vehicles to calculate distances!");
      return;
    }

    let distanceInfo = "Current distances between vehicles:\n\n";

    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const vehicle1 = vehicles[i];
        const vehicle2 = vehicles[j];

        if (vehicle1.currentLocation && vehicle2.currentLocation) {
          // Simple distance calculation (approximate)
          const lat1 = vehicle1.currentLocation.latitude;
          const lon1 = vehicle1.currentLocation.longitude;
          const lat2 = vehicle2.currentLocation.latitude;
          const lon2 = vehicle2.currentLocation.longitude;

          // Haversine formula for distance calculation
          const R = 6371000; // Earth's radius in meters
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          distanceInfo += `${vehicle1.vehicleId} ↔ ${
            vehicle2.vehicleId
          }: ${distance.toFixed(1)} meters\n`;
        } else {
          distanceInfo += `${vehicle1.vehicleId} ↔ ${vehicle2.vehicleId}: No GPS data\n`;
        }
      }
    }

    alert(distanceInfo);
  };

  return (
    <div className="dashboard-panel">
      <h3>GPS Simulation</h3>
      
      <div className="gps-help-info">
        <div className="help-item">
          <strong>🔧 GPS Permission Issues?</strong>
          <p>If GPS is denied: Click the 🔒 or 📍 icon in your browser's address bar → Allow location → Reload page</p>
        </div>
      </div>

      <div className="simulation-controls">
        <div className="control-row">
          <button
            className={`control-btn ${isMonitoring ? "active" : ""}`}
            onClick={handleStartMonitoring}
          >
            Start Monitoring
          </button>
          <button className="control-btn stop" onClick={handleStopMonitoring}>
            Stop Monitoring
          </button>
        </div>

        <div className="control-row">
          <button
            className="control-btn warning"
            onClick={simulateNearCollision}
          >
            Simulate Near Collision (2.5m)
          </button>
          <button
            className="control-btn danger"
            onClick={simulateExactCollision}
          >
            Simulate Exact Collision (0.0m)
          </button>
        </div>

        <div className="control-row">
          <button className="control-btn" onClick={resetPositions}>
            Reset Positions
          </button>
        </div>

        <div className="control-row">
          <button
            className="control-btn success"
            onClick={assignRandomPositions}
          >
            Assign Random Positions
          </button>
          <button className="control-btn info" onClick={showDistances}>
            Show Distances
          </button>
        </div>

        <div className="control-row">
          <button className="control-btn danger" onClick={clearStorage}>
            Clear Storage
          </button>
        </div>
      </div>
    </div>
  );
};

export default GPSSimulation;
