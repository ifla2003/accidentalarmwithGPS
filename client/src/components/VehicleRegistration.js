import React, { useState } from 'react';
import './VehicleRegistration.css';

const VehicleRegistration = ({ onAddVehicle }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // If starts with 91, remove it (we'll add +91 automatically)
    const cleanDigits = digits.startsWith('91') && digits.length > 10 ? digits.substring(2) : digits;
    
    // Limit to 10 digits for Indian mobile
    return cleanDigits.substring(0, 10);
  };

  const validatePhoneNumber = (phone) => {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 0) {
      return 'Mobile number is required';
    }
    
    if (digits.length !== 10) {
      return 'Mobile number must be 10 digits';
    }
    
    // Indian mobile numbers start with 6, 7, 8, or 9
    if (!['6', '7', '8', '9'].includes(digits[0])) {
      return 'Invalid Indian mobile number';
    }
    
    return '';
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    
    const error = validatePhoneNumber(formatted);
    setPhoneError(error);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const phoneError = validatePhoneNumber(phoneNumber);
    setPhoneError(phoneError);
    
    if (phoneNumber.trim() && vehicleId.trim() && !phoneError) {
      // Add +91 prefix automatically
      const fullPhoneNumber = `+91${phoneNumber.trim()}`;
      onAddVehicle(fullPhoneNumber, vehicleId.trim());
      setPhoneNumber('');
      setVehicleId('');
      setPhoneError('');
    }
  };

  return (
    <div className="dashboard-panel">
      <h3>Register Vehicle</h3>
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="input-group">
          <div className="phone-input-container">
            <span className="country-code">+91</span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="9876543210"
              className={phoneError ? 'error' : ''}
              required
            />
          </div>
          {phoneError && <div className="error-message">{phoneError}</div>}
        </div>
        <input
          type="text"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          placeholder="Vehicle ID (e.g., CAR01)"
          required
        />
        <button type="submit" className="add-vehicle-btn">
          Add Vehicle
        </button>
      </form>
    </div>
  );
};

export default VehicleRegistration;