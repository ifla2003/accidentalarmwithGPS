import React, { useEffect, useState } from 'react';
import './CollisionAlert.css';

const CollisionAlert = ({ alert, onDismiss }) => {
  const [isBlinking, setIsBlinking] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    // Start voice alert
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Collision warning! Vehicles ${alert.vehicle1.vehicleId} and ${alert.vehicle2.vehicleId} are ${alert.distance.toFixed(1)} meters apart!`
      );
      utterance.rate = 1.2;
      utterance.pitch = 1.5;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }

    // Play alarm sound (you can add an audio file)
    playAlarmSound();

    // Stop blinking after 30 seconds
    const blinkTimer = setTimeout(() => {
      setIsBlinking(false);
    }, 30000);

    return () => {
      clearTimeout(blinkTimer);
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, [alert]);

  const playAlarmSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Repeat beep every second for 10 seconds
      let beepCount = 0;
      const beepInterval = setInterval(() => {
        if (beepCount < 10) {
          const newOscillator = audioContext.createOscillator();
          const newGainNode = audioContext.createGain();
          
          newOscillator.connect(newGainNode);
          newGainNode.connect(audioContext.destination);
          
          newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          
          newOscillator.start();
          newOscillator.stop(audioContext.currentTime + 0.5);
          
          beepCount++;
        } else {
          clearInterval(beepInterval);
        }
      }, 1000);
      
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  };

  return (
    <div className={`collision-alert ${isBlinking ? 'blinking' : ''}`}>
      <div className="alert-content">
        <div className="alert-icon">⚠️</div>
        <div className="alert-text">
          <h2>COLLISION WARNING!</h2>
          <div className="vehicles-involved">
            <h3>Vehicles Involved:</h3>
            <div className="vehicle-pair">
              <div className="vehicle-info">
                <div className="vehicle-name">{alert.vehicle1.vehicleId}</div>
                <div className="vehicle-phone">{alert.vehicle1.phoneNumber}</div>
              </div>
              <div className="vs-separator">⚡</div>
              <div className="vehicle-info">
                <div className="vehicle-name">{alert.vehicle2.vehicleId}</div>
                <div className="vehicle-phone">{alert.vehicle2.phoneNumber}</div>
              </div>
            </div>
          </div>
          <div className="distance-warning">
            <p>Distance: <strong>{alert.distance.toFixed(1)} meters</strong></p>
            <p className="danger-text">IMMEDIATE COLLISION RISK!</p>
          </div>
          <p className="timestamp">
            Alert Time: {new Date(alert.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button className="dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default CollisionAlert;