import React, { useState } from "react";
import "./AuthPage.css";

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    vehicleId: "",
    name: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login process - call server API
        const loginData = {
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
        };

        const response = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log("Login successful");
          onLogin(result.user);
        } else {
          alert(result.error || "Login failed");
        }
      } else {
        // Registration process - call server API
        const registrationData = {
          phoneNumber: formData.phoneNumber.trim(),
          vehicleId: formData.vehicleId.trim(),
          fullName: formData.name.trim(),
          password: formData.password,
        };

        const response = await fetch("http://localhost:5000/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log("Registration successful, logging in automatically...");
          onLogin(result.user);
        } else {
          alert(result.error || "Registration failed");
          if (result.error && result.error.includes("already registered")) {
            setIsLogin(true);
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
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
            className={`tab-btn ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`tab-btn ${!isLogin ? "active" : ""}`}
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

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? "Processing..." : isLogin ? "Login" : "Register"}
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
