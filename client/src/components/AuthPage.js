import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    vehicleId: '',
    name: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login process
        const loginData = {
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password
        };
        
        // Simulate login validation (in real app, this would be an API call)
        const savedUser = localStorage.getItem(`user_${loginData.phoneNumber}`);
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          if (userData.password === loginData.password) {
            // Start GPS tracking immediately after login
            startGPSTracking(userData);
            onLogin(userData);
          } else {
            alert('Invalid password!');
          }
        } else {
          alert('Phone number not registered. Please register first.');
        }
      } else {
        // Registration process
        const userData = {
          phoneNumber: formData.phoneNumber.trim(),
          vehicleId: formData.vehicleId.trim(),
          name: formData.name.trim(),
          password: formData.password,
          registeredAt: new Date().toISOString()
        };

        // Check if user already exists
        const existingUser = localStorage.getItem(`user_${userData.phoneNumber}`);
        if (existingUser) {
          alert('Phone number already registered. Please login instead.');
          setIsLogin(true);
          return;
        }

        // Save user data (in real app, this would be an API call)
        localStorage.setItem(`user_${userData.phoneNumber}`, JSON.stringify(userData));
        
        // Automatically log in the user after successful registration
        console.log('Registration successful, logging in automatically...');
        startGPSTracking(userData);
        onLogin(userData);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startGPSTracking = (userData) => {
    if (!navigator.geolocation) {
      console.log('GPS not supported, will start tracking after login');
      return;
    }

    // Try to get initial location with better error handling
    navigator.geolocation.getCurrentPosition(
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
        
        console.log(`Initial GPS location for ${userData.name}:`, locationData);
        localStorage.setItem(`location_${userData.phoneNumber}`, JSON.stringify(locationData));
      },
      (error) => {
        console.error("Initial GPS Error:", error);
        // Don't show alert here, let the main app handle GPS tracking
        console.log('Initial GPS failed, main app will handle continuous tracking');
      },
      { 
        enableHighAccuracy: false, // Less strict for initial attempt
        maximumAge: 30000, // Allow cached location
        timeout: 20000 // Reasonable timeout
      }
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🚗 Vehicle Safety System</h1>
          <p>GPS-based collision warning system</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+1234567890"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle ID</label>
                <input
                  type="text"
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleInputChange}
                  placeholder="CAR01, TRUCK02, etc."
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-info">
          <p>📍 Location permissions will be requested after login</p>
          <p>🔒 Your data is stored locally on your device</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;