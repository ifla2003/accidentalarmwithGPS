import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import CollisionAlert from "./components/CollisionAlert";
import Dashboard from "./components/Dashboard";
import MapDemo from "./components/MapDemo";
import LandingPage from "./components/LandingPage";
import AboutLegal from "./components/AboutLegal";
import Contact from "./components/Contact";
import Feedback from "./components/Feedback";
import "./App.css";

// const socket = io("http://localhost:5000");
const socket = io("https://ucasaapp.testatozas.in/");

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [collisionAlert, setCollisionAlert] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [gpsStatus, setGpsStatus] = useState("inactive"); // inactive, searching, active, error
  const [systemStatus, setSystemStatus] = useState({
    monitoring: "Active",
    lastUpdate: new Date().toLocaleTimeString(),
    collisionThreshold: 3,
    warningThreshold: 5,
    maxRange: "0.6km / 5km max range",
  });
  const [showAboutLegal, setShowAboutLegal] = useState(false);
  const [aboutLegalView, setAboutLegalView] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Separate useEffect for socket setup
  useEffect(() => {
    // Listen for vehicle updates
    socket.on("vehicles-update", (vehicleList) => {
      setVehicles(vehicleList);
      // Update system status
      setSystemStatus((prev) => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    });

    // Listen for all users updates
    socket.on("all-users-update", (userList) => {
      setAllUsers(userList);
      console.log(`Received ${userList.length} users with location data`);
    });

    // Listen for collision alerts
      socket.on("collision-alert", (alert) => {
        setCollisionAlert(alert);
        // Auto-dismiss alert after 3 minutes (180 seconds)
        setTimeout(() => setCollisionAlert(null), 180000);
      });

    // Request initial vehicle list and all users
    socket.emit("get-vehicles");
    socket.emit("get-all-users");

    // Update time every second
    const timeInterval = setInterval(() => {
      setSystemStatus((prev) => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    }, 1000);

    // Fetch all users every 10 seconds to get latest positions
    const usersInterval = setInterval(() => {
      socket.emit("get-all-users");
    }, 10000);

    return () => {
      socket.off("vehicles-update");
      socket.off("all-users-update");
      socket.off("collision-alert");
      clearInterval(timeInterval);
      clearInterval(usersInterval);
    };
  }, []);

  // Check if user is already registered in database
  useEffect(() => {
    const checkExistingUser = async () => {
      // Try to get user from a stored phone number
      const storedPhone = localStorage.getItem("userPhone");
      if (storedPhone) {
        try {
          const response = await fetch(`https://ucasaapp.testatozas.in/api/user/${storedPhone}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setCurrentUser(result.user);
              setShowLandingPage(false);
              // Auto-register the user as a vehicle (but don't wait for response)
              handleAddVehicle(result.user.phoneNumber, result.user.vehicleId, result.user.name, result.user.vehicleType || 'car')
                .catch(error => console.error("Auto-registration failed:", error));
            } else {
              setShowLandingPage(true);
            }
          } else {
            // User not found in database, clear local storage
            localStorage.removeItem("userPhone");
            setShowLandingPage(true);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Clear local storage on error
          localStorage.removeItem("userPhone");
          setShowLandingPage(true);
        }
      } else {
        setShowLandingPage(true);
      }
    };

    checkExistingUser();
  }, []);

  const startSimulatedLocationDirect = (userData) => {
    console.log(`Using simulated location for ${userData.name} (direct)`);
    setGpsStatus("active");

    // Use a base location (New York City) with slight randomization
    const baseLocation = { latitude: 40.7128, longitude: -74.006 };

    // Add small random offset for each user to prevent exact overlap
    const randomOffset = () => (Math.random() - 0.5) * 0.001; // ~50 meter radius

    const simulatedLocation = {
      phoneNumber: userData.phoneNumber,
      latitude: baseLocation.latitude + randomOffset(),
      longitude: baseLocation.longitude + randomOffset(),
      accuracy: 10, // Simulated accuracy
      timestamp: new Date().toISOString(),
      speed: 0,
      heading: 0,
      isSimulated: true,
    };

    console.log(`Simulated location for ${userData.name}:`, simulatedLocation);
    handleLocationUpdate(simulatedLocation);

    // Start simulated movement (moves vehicle slightly every 3 seconds for smooth animation)
    const simulationInterval = setInterval(() => {
      const updatedLocation = {
        phoneNumber: userData.phoneNumber,
        latitude: simulatedLocation.latitude + randomOffset() * 0.1,
        longitude: simulatedLocation.longitude + randomOffset() * 0.1,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        speed: Math.random() * 5, // 0-5 km/h
        heading: Math.random() * 360,
        isSimulated: true,
      };

      console.log(`Simulated movement for ${userData.name}:`, updatedLocation);
      handleLocationUpdate(updatedLocation);
    }, 3000); // Update every 3 seconds for smooth animation

    // Store simulation interval for cleanup
    localStorage.setItem("simulationInterval", simulationInterval);
  };

  const startContinuousGPSTracking = (userData) => {
    console.log(`Starting GPS tracking for ${userData.name}...`);

    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setGpsStatus("error");
      alert(
        "GPS not supported on this device. Please use a device with GPS capability."
      );
      return;
    }

    // Check if we already have a watch running
    const existingWatchId = localStorage.getItem("gpsWatchId");
    if (existingWatchId) {
      console.log("Clearing existing GPS watch...");
      navigator.geolocation.clearWatch(parseInt(existingWatchId));
      localStorage.removeItem("gpsWatchId");
    }

    let retryCount = 0;
    const maxRetries = 3;
    let watchId = null;

    const startTracking = () => {
      console.log("Requesting GPS permission and location...");
      setGpsStatus("searching");

      // First try to get current position with longer timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Initial GPS fix obtained for ${userData.name}`);
          setGpsStatus("active");
          const locationData = {
            phoneNumber: userData.phoneNumber,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
          };
          handleLocationUpdate(locationData);

          // Now start continuous tracking with more relaxed settings
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData = {
                phoneNumber: userData.phoneNumber,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              };
              console.log(`GPS update for ${userData.name}:`, locationData);
              handleLocationUpdate(locationData);
            },
            (error) => {
              console.error("GPS Watch Error:", error);
              handleGPSError(error, userData);
            },
            {
              enableHighAccuracy: false, // Less battery intensive
              maximumAge: 2000, // Allow positions up to 2 seconds old for smoother updates
              timeout: 30000, // Longer timeout for watch
            }
          );

          localStorage.setItem("gpsWatchId", watchId);
        },
        (error) => {
          console.error("Initial GPS Error:", error);
          handleGPSError(error, userData);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Force fresh position
          timeout: 60000, // Very long timeout for initial fix
        }
      );
    };

    const handleGPSError = (error, userData) => {
      let errorMessage = `GPS Error for ${userData.name}: `;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage +=
            "Location access denied. Please enable GPS permissions in your browser.";
          setGpsStatus("error");
          alert(errorMessage);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage +=
            "GPS signal unavailable. Trying with less accuracy...";
          console.log(errorMessage);
          retryWithLowerAccuracy();
          break;
        case error.TIMEOUT:
          errorMessage += "GPS timeout. Retrying...";
          console.log(errorMessage);
          setGpsStatus("searching");
          retryGPS();
          break;
        default:
          errorMessage += "Unknown GPS error. Retrying...";
          console.log(errorMessage);
          retryGPS();
          break;
      }
    };

    const retryGPS = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying GPS (attempt ${retryCount}/${maxRetries})...`);
        setTimeout(() => {
          startTracking();
        }, 2000 * retryCount); // Increasing delay
      } else {
        console.log("GPS failed, offering fallback options...");
        offerFallbackOptions();
      }
    };

    const offerFallbackOptions = () => {
      const useSimulated = window.confirm(
        `GPS location failed after ${maxRetries} attempts.\n\nWould you like to use a simulated location for testing?\n\nClick OK for simulated location, or Cancel to try GPS again.`
      );

      if (useSimulated) {
        startSimulatedLocation();
      } else {
        // Reset retry count and try again
        retryCount = 0;
        setTimeout(() => {
          startTracking();
        }, 1000);
      }
    };

    const startSimulatedLocation = () => {
      console.log(`Using simulated location for ${userData.name}`);
      setGpsStatus("active");

      // Use a base location (New York City) with slight randomization
      const baseLocation = { latitude: 40.7128, longitude: -74.006 };

      // Add small random offset for each user to prevent exact overlap
      const randomOffset = () => (Math.random() - 0.5) * 0.001; // ~50 meter radius

      const simulatedLocation = {
        phoneNumber: userData.phoneNumber,
        latitude: baseLocation.latitude + randomOffset(),
        longitude: baseLocation.longitude + randomOffset(),
        accuracy: 10, // Simulated accuracy
        timestamp: new Date().toISOString(),
        speed: 0,
        heading: 0,
        isSimulated: true,
      };

      console.log(
        `Simulated location for ${userData.name}:`,
        simulatedLocation
      );
      handleLocationUpdate(simulatedLocation);

      // Start simulated movement (optional - moves vehicle slightly every 3 seconds for smooth animation)
      const simulationInterval = setInterval(() => {
        const updatedLocation = {
          phoneNumber: userData.phoneNumber,
          latitude: simulatedLocation.latitude + randomOffset() * 0.1,
          longitude: simulatedLocation.longitude + randomOffset() * 0.1,
          accuracy: 10,
          timestamp: new Date().toISOString(),
          speed: Math.random() * 5, // 0-5 km/h
          heading: Math.random() * 360,
          isSimulated: true,
        };

        console.log(
          `Simulated movement for ${userData.name}:`,
          updatedLocation
        );
        handleLocationUpdate(updatedLocation);
      }, 3000); // Update every 3 seconds for smooth animation

      // Store simulation interval for cleanup
      localStorage.setItem("simulationInterval", simulationInterval);
    };

    const retryWithLowerAccuracy = () => {
      console.log("Trying with lower accuracy GPS...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Low accuracy GPS fix obtained for ${userData.name}`);
          setGpsStatus("active");
          const locationData = {
            phoneNumber: userData.phoneNumber,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
          };
          console.log(
            `Low accuracy GPS fix for ${userData.name}:`,
            locationData
          );
          handleLocationUpdate(locationData);

          // Start continuous tracking after successful low-accuracy fix
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData = {
                phoneNumber: userData.phoneNumber,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              };
              console.log(`GPS update for ${userData.name}:`, locationData);
              handleLocationUpdate(locationData);
            },
            (error) => {
              console.error("GPS Watch Error:", error);
              handleGPSError(error, userData);
            },
            {
              enableHighAccuracy: false,
              maximumAge: 2000, // More frequent updates for smoother movement
              timeout: 30000,
            }
          );

          localStorage.setItem("gpsWatchId", watchId);
        },
        (error) => {
          console.error("Low accuracy GPS also failed:", error);
          console.log("All GPS methods failed, offering fallback...");
          offerFallbackOptions();
        },
        {
          enableHighAccuracy: false,
          maximumAge: 10000,
          timeout: 30000,
        }
      );
    };

    startTracking();
  };

  const handleAddVehicle = (phoneNumber, vehicleId, fullName, vehicleType) => {
    return new Promise((resolve, reject) => {
      socket.emit("register-vehicle", { phoneNumber, vehicleId, fullName, vehicleType });
      
      // Listen for registration success
      const handleSuccess = (data) => {
        socket.off("registration-success", handleSuccess);
        socket.off("registration-error", handleError);
        resolve(data);
      };
      
      const handleError = (error) => {
        socket.off("registration-success", handleSuccess);
        socket.off("registration-error", handleError);
        reject(new Error(error.error || "Registration failed"));
      };
      
      socket.on("registration-success", handleSuccess);
      socket.on("registration-error", handleError);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off("registration-success", handleSuccess);
        socket.off("registration-error", handleError);
        reject(new Error("Registration timeout"));
      }, 10000);
    });
  };

  const handleUpdateUser = (userData) => {
    setCurrentUser(userData);
    if (userData) {
      setShowLandingPage(false);
    }
  };

  const stopGPSTracking = () => {
    console.log("Stopping GPS tracking...");
    
    // Clear GPS watch if it exists
    const existingWatchId = localStorage.getItem("gpsWatchId");
    if (existingWatchId) {
      console.log("Clearing GPS watch...");
      navigator.geolocation.clearWatch(parseInt(existingWatchId));
      localStorage.removeItem("gpsWatchId");
    }
    
    // Clear simulation interval if it exists
    const simulationInterval = localStorage.getItem("simulationInterval");
    if (simulationInterval) {
      console.log("Clearing simulation interval...");
      clearInterval(parseInt(simulationInterval));
      localStorage.removeItem("simulationInterval");
    }
    
    // Set GPS status to inactive
    setGpsStatus("inactive");
    console.log("GPS tracking stopped");
  };

  const handleRemoveVehicle = (phoneNumber) => {
    socket.emit("remove-vehicle", { phoneNumber });
  };

  const handleToggleDriving = (phoneNumber, isDriving) => {
    socket.emit("toggle-driving", { phoneNumber, isDriving });
  };

  const handleToggleLocationTracking = (
    phoneNumber,
    locationTrackingEnabled
  ) => {
    return new Promise((resolve, reject) => {
      socket.emit("toggle-location-tracking", {
        phoneNumber,
        locationTrackingEnabled,
      });

      // Listen for response
      const handleResponse = (data) => {
        if (data.phoneNumber === phoneNumber) {
          socket.off("location-tracking-updated", handleResponse);
          if (data.success) {
            resolve(data);
          } else {
            reject(
              new Error(data.error || "Failed to update location tracking")
            );
          }
        }
      };

      socket.on("location-tracking-updated", handleResponse);

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off("location-tracking-updated", handleResponse);
        reject(new Error("Request timeout"));
      }, 5000);
    });
  };

  const handleLocationUpdate = (vehicleData) => {
    socket.emit("location-update", vehicleData);
  };

  const dismissAlert = () => {
    setCollisionAlert(null);
  };

  const handleGetStarted = () => {
    setShowLandingPage(false);
  };

  const handleBackToLanding = () => {
    setShowLandingPage(true);
  };

  const handleShowAboutLegalWithView = (view) => {
    setAboutLegalView(view);
    setShowAboutLegal(true);
  };

  const handleCloseAboutLegal = () => {
    setShowAboutLegal(false);
    setAboutLegalView(null);
  };

  // Show contact page
  if (showContact) {
    return (
      <div className="App">
        <Contact onBack={() => setShowContact(false)} />
      </div>
    );
  }

  // Show feedback page
  if (showFeedback) {
    return (
      <div className="App">
        <Feedback onBack={() => setShowFeedback(false)} />
      </div>
    );
  }

  // Show landing page if no user and landing page should be shown
  if (showLandingPage && !currentUser) {
    return (
      <div className="App">
        <LandingPage 
          onGetStarted={handleGetStarted} 
          onShowAboutLegal={() => setShowAboutLegal(true)} 
          onShowAboutLegalWithView={handleShowAboutLegalWithView}
          onShowContact={() => setShowContact(true)}
          onShowFeedback={() => setShowFeedback(true)}
        />
        <AboutLegal
          open={showAboutLegal}
          onClose={handleCloseAboutLegal}
          initialView={aboutLegalView}
        />
      </div>
    );
  }

  if (demoMode) {
    return (
      <div className="App">
        <header className="App-header">
          <span className="header-icon">🗺️</span>
          <h1>Vehicle Map Demo</h1>
          <p>Interactive OpenStreetMap with vehicle tracking</p>
          <button
            onClick={() => setDemoMode(false)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0984e3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            ← Back to Main App
          </button>
        </header>

        <main className="App-main">
          <MapDemo />
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-main">
            {!currentUser && (
              <button 
                className="back-btn"
                onClick={handleBackToLanding}
                title="Back to Landing Page"
              >
                ← Back
              </button>
            )}
            {/* <span className="header-icon">UcasaApp</span> */}
            <div>
              <h1>Universal Collision Avoidance System Advisory App</h1>
              <p>GPS-based proximity alarm for accident prevention</p>
            </div>
          </div>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">👤 {currentUser?.name}</span>
              <span className="user-vehicle">🚗 {currentUser?.vehicleId}</span>
              <span className="user-phone">📱 {currentUser?.phoneNumber}</span>
              <div className={`gps-status ${gpsStatus}`}>
                {gpsStatus === "searching" && "🔍 Getting GPS..."}
                {gpsStatus === "active" && "📍 GPS Active"}
                {gpsStatus === "error" && "❌ GPS Error"}
                {gpsStatus === "inactive" && "📍 GPS Inactive"}
              </div>
            </div>
            <div className="header-buttons">
              {/* {gpsStatus === "inactive" || gpsStatus === "error" ? (
                <>
                  <button
                    onClick={() => startContinuousGPSTracking(currentUser)}
                    className="gps-btn"
                  >
                    Start GPS
                  </button>
                  <button
                    onClick={() => startSimulatedLocationDirect(currentUser)}
                    className="sim-btn"
                  >
                    Use Demo Location
                  </button>
                </>
              ) : null} */}
              {/* <button
                type="button"
                className="about-btn"
                onClick={() => setShowAboutLegal(true)}
              >
                About / Legal
              </button> */}
            </div>
          </div>
        </div>
      </header>

      <main className="App-main">
        <Dashboard
          vehicles={vehicles}
          allUsers={allUsers}
          systemStatus={systemStatus}
          currentUser={currentUser}
          onAddVehicle={handleAddVehicle}
          onRemoveVehicle={handleRemoveVehicle}
          onToggleDriving={handleToggleDriving}
          onLocationUpdate={handleLocationUpdate}
          onToggleLocationTracking={handleToggleLocationTracking}
          gpsStatus={gpsStatus}
          onStartGPS={() => startContinuousGPSTracking(currentUser)}
          onStartSimulated={() => startSimulatedLocationDirect(currentUser)}
          onUpdateUser={handleUpdateUser}
          onStopGPS={stopGPSTracking}
        />

        {collisionAlert && (
          <CollisionAlert alert={collisionAlert} onDismiss={dismissAlert} />
        )}

        <AboutLegal
          open={showAboutLegal}
          onClose={handleCloseAboutLegal}
          initialView={aboutLegalView}
        />
      </main>
    </div>
  );
}

export default App;
