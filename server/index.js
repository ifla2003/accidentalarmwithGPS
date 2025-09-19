const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const { getDistance } = require("geolib");
require("dotenv").config();
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/collision-alarm",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Vehicle schema
const vehicleSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  vehicleId: { type: String, required: true },
  fullName: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now },
    accuracy: Number,
    speed: Number,
    heading: Number,
    isSimulated: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  isDriving: { type: Boolean, default: true },
  locationTrackingEnabled: { type: Boolean, default: false },
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

// Store active connections
const activeConnections = new Map();

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build"));
});

// Socket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register-vehicle", async (data) => {
    const { phoneNumber, vehicleId, fullName } = data;
    activeConnections.set(socket.id, { phoneNumber, vehicleId, fullName });

    try {
      // Check if vehicle already exists
      let vehicle = await Vehicle.findOne({ phoneNumber });
      
      if (vehicle) {
        // Update existing vehicle
        vehicle = await Vehicle.findOneAndUpdate(
          { phoneNumber },
          { isActive: true, locationTrackingEnabled: false },
          { new: true }
        );
      } else {
        // Create new vehicle
        vehicle = new Vehicle({
          phoneNumber,
          vehicleId,
          fullName,
          isActive: true,
          isDriving: true,
          locationTrackingEnabled: false,
        });
        await vehicle.save();
      }

      // Send updated vehicle list to all clients
      const allVehicles = await Vehicle.find({ isActive: true });
      io.emit("vehicles-update", allVehicles);

      // Return user data
      const userData = {
        phoneNumber: vehicle.phoneNumber,
        vehicleId: vehicle.vehicleId,
        name: vehicle.fullName,
        registeredAt: vehicle.registeredAt,
      };

      socket.emit("registration-success", { 
        phoneNumber, 
        vehicleId, 
        fullName,
        user: userData 
      });
    } catch (error) {
      console.error("Register vehicle error:", error);
      socket.emit("registration-error", { error: "Failed to register vehicle." });
    }
  });

  socket.on("remove-vehicle", async (data) => {
    const { phoneNumber } = data;

    try {
      await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { isActive: false },
        { new: true }
      );

      // Send updated vehicle list to all clients
      const allVehicles = await Vehicle.find({ isActive: true });
      io.emit("vehicles-update", allVehicles);
    } catch (error) {
      console.error("Remove vehicle error:", error);
    }
  });

  socket.on("toggle-driving", async (data) => {
    const { phoneNumber, isDriving } = data;

    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { isDriving },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `Vehicle ${vehicle.vehicleId} driving status updated to: ${isDriving}`
        );

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);
      }
    } catch (error) {
      console.error("Toggle driving error:", error);
    }
  });

  socket.on("toggle-location-tracking", async (data) => {
    const { phoneNumber, locationTrackingEnabled } = data;

    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { locationTrackingEnabled },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `Vehicle ${vehicle.vehicleId} location tracking updated to: ${locationTrackingEnabled}`
        );

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);

        // Also send updated all users list
        const allUsers = await Vehicle.find({
          locationTrackingEnabled: true,
          "currentLocation.latitude": { $exists: true, $ne: null },
          "currentLocation.longitude": { $exists: true, $ne: null },
        }).sort({ "currentLocation.timestamp": -1 });
        io.emit("all-users-update", allUsers);

        // Send specific response to the requesting client
        socket.emit("location-tracking-updated", {
          phoneNumber,
          locationTrackingEnabled,
          success: true,
        });
      }
    } catch (error) {
      console.error("Toggle location tracking error:", error);
      socket.emit("location-tracking-updated", {
        phoneNumber,
        locationTrackingEnabled: false,
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("get-vehicles", async () => {
    try {
      const allVehicles = await Vehicle.find({ isActive: true });
      socket.emit("vehicles-update", allVehicles);
    } catch (error) {
      console.error("Get vehicles error:", error);
    }
  });

  socket.on("get-all-users", async () => {
    try {
      // Fetch all users with location tracking enabled and valid location data
      const allUsers = await Vehicle.find({
        locationTrackingEnabled: true,
        "currentLocation.latitude": { $exists: true, $ne: null },
        "currentLocation.longitude": { $exists: true, $ne: null },
      }).sort({ "currentLocation.timestamp": -1 });

      console.log(`Fetched ${allUsers.length} users with location data`);
      socket.emit("all-users-update", allUsers);
    } catch (error) {
      console.error("Get all users error:", error);
      socket.emit("all-users-update", []);
    }
  });

  socket.on("location-update", async (data) => {
    const {
      phoneNumber,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      isSimulated,
    } = data;

    console.log(
      `Location update received: ${phoneNumber} -> ${latitude}, ${longitude}`
    );

    try {
      // First check if the vehicle has location tracking enabled
      const existingVehicle = await Vehicle.findOne({ phoneNumber });

      if (!existingVehicle || !existingVehicle.locationTrackingEnabled) {
        console.log(
          `Location update ignored for ${phoneNumber} - location tracking disabled`
        );
        return;
      }

      // Update vehicle location with additional data
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        {
          currentLocation: {
            latitude,
            longitude,
            timestamp: new Date(),
            accuracy: accuracy || null,
            speed: speed || null,
            heading: heading || null,
            isSimulated: isSimulated || false,
          },
        },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `Vehicle ${vehicle.vehicleId} updated in DB: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`
        );

        // Check for nearby vehicles
        await checkCollisionRisk(vehicle, io);

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);

        // Also send updated all users list
        const allUsers = await Vehicle.find({
          locationTrackingEnabled: true,
          "currentLocation.latitude": { $exists: true, $ne: null },
          "currentLocation.longitude": { $exists: true, $ne: null },
        }).sort({ "currentLocation.timestamp": -1 });
        io.emit("all-users-update", allUsers);
      }
    } catch (error) {
      console.error("Location update error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    activeConnections.delete(socket.id);
  });
});

// Collision detection function
async function checkCollisionRisk(currentVehicle, io) {
  const COLLISION_DISTANCE = 3; // 3 meter collision threshold
  const WARNING_DISTANCE = 5; // 5 meter warning threshold

  try {
    // Only check collision if current vehicle has location tracking enabled
    if (!currentVehicle.locationTrackingEnabled) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} has location tracking disabled, skipping collision check`
      );
      return;
    }

    // Only check collision if current vehicle has valid location data
    if (
      !currentVehicle.currentLocation ||
      !currentVehicle.currentLocation.latitude ||
      !currentVehicle.currentLocation.longitude
    ) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} has no location data, skipping collision check`
      );
      return;
    }

    // Find other active vehicles with valid location data, location tracking enabled, and are driving
    const allVehicles = await Vehicle.find({
      isActive: true,
      isDriving: true, // Only check collision with driving vehicles
      locationTrackingEnabled: true, // Only check collision with vehicles that have location tracking enabled
      phoneNumber: { $ne: currentVehicle.phoneNumber },
      "currentLocation.latitude": { $exists: true, $ne: null },
      "currentLocation.longitude": { $exists: true, $ne: null },
    });

    // Also skip collision check if current vehicle is stopped
    if (!currentVehicle.isDriving) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} is stopped, skipping collision check`
      );
      return;
    }

    console.log(
      `Checking collision for ${currentVehicle.vehicleId} against ${allVehicles.length} other vehicles with location data`
    );

    // Find the socket connection for the current vehicle user
    const currentUserSocket = findSocketByPhoneNumber(
      currentVehicle.phoneNumber
    );

    for (const otherVehicle of allVehicles) {
      // Double-check that location data is valid
      if (
        otherVehicle.currentLocation.latitude &&
        otherVehicle.currentLocation.longitude
      ) {
        const distance = getDistance(
          {
            latitude: currentVehicle.currentLocation.latitude,
            longitude: currentVehicle.currentLocation.longitude,
          },
          {
            latitude: otherVehicle.currentLocation.latitude,
            longitude: otherVehicle.currentLocation.longitude,
          }
        );

        // Log coordinates and distance calculation for debugging
        console.log(
          `Distance between ${currentVehicle.vehicleId} and ${otherVehicle.vehicleId}: ${distance} meters`
        );

        // Check if distance is within collision threshold (7m)
        if (distance <= COLLISION_DISTANCE) {
          const collisionAlertData = {
            type: "COLLISION_ALERT",
            alertLevel: "COLLISION",
            distance: distance,
            nearbyVehicle: {
              phoneNumber: otherVehicle.phoneNumber,
              vehicleId: otherVehicle.vehicleId,
              fullName: otherVehicle.fullName,
              location: otherVehicle.currentLocation,
            },
            timestamp: new Date(),
          };

          console.log(
            `🚨 COLLISION ALERT: ${distance}m between ${currentVehicle.vehicleId} and ${otherVehicle.vehicleId}`
          );

          // Send collision alert to the current vehicle user (only if location tracking is enabled)
          if (currentUserSocket && currentVehicle.locationTrackingEnabled) {
            currentUserSocket.emit("collision-alert", collisionAlertData);
          }

          // Also send alert to the other vehicle user (only if their location tracking is enabled)
          const otherUserSocket = findSocketByPhoneNumber(
            otherVehicle.phoneNumber
          );
          if (otherUserSocket && otherVehicle.locationTrackingEnabled) {
            const otherVehicleAlertData = {
              type: "COLLISION_ALERT",
              alertLevel: "COLLISION",
              distance: distance,
              nearbyVehicle: {
                phoneNumber: currentVehicle.phoneNumber,
                vehicleId: currentVehicle.vehicleId,
                fullName: currentVehicle.fullName,
                location: currentVehicle.currentLocation,
              },
              timestamp: new Date(),
            };
            otherUserSocket.emit("collision-alert", otherVehicleAlertData);
          }
        }
        // Check if distance is within warning threshold (10m) but not collision
        else if (distance <= WARNING_DISTANCE) {
          const warningAlertData = {
            type: "WARNING_ALERT",
            alertLevel: "WARNING",
            distance: distance,
            nearbyVehicle: {
              phoneNumber: otherVehicle.phoneNumber,
              vehicleId: otherVehicle.vehicleId,
              fullName: otherVehicle.fullName,
              location: otherVehicle.currentLocation,
            },
            timestamp: new Date(),
          };

          console.log(
            `⚠️ WARNING ALERT: ${distance}m between ${currentVehicle.vehicleId} and ${otherVehicle.vehicleId}`
          );

          // Send warning alert to the current vehicle user (only if location tracking is enabled)
          if (currentUserSocket && currentVehicle.locationTrackingEnabled) {
            currentUserSocket.emit("collision-alert", warningAlertData);
          }

          // Also send warning alert to the other vehicle user (only if their location tracking is enabled)
          const otherUserSocket = findSocketByPhoneNumber(
            otherVehicle.phoneNumber
          );
          if (otherUserSocket && otherVehicle.locationTrackingEnabled) {
            const otherVehicleWarningData = {
              type: "WARNING_ALERT",
              alertLevel: "WARNING",
              distance: distance,
              nearbyVehicle: {
                phoneNumber: currentVehicle.phoneNumber,
                vehicleId: currentVehicle.vehicleId,
                fullName: currentVehicle.fullName,
                location: currentVehicle.currentLocation,
              },
              timestamp: new Date(),
            };
            otherUserSocket.emit("collision-alert", otherVehicleWarningData);
          }
        }
      }
    }
  } catch (error) {
    console.error("Collision check error:", error);
  }
}

// Helper function to find socket by phone number
function findSocketByPhoneNumber(phoneNumber) {
  for (const [socketId, userData] of activeConnections.entries()) {
    if (userData.phoneNumber === phoneNumber) {
      return io.sockets.sockets.get(socketId);
    }
  }
  return null;
}

// REST API endpoints
app.get("/api/vehicles", async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ isActive: true });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/all-users", async (req, res) => {
  try {
    // Fetch all users with location tracking enabled and valid location data
    const allUsers = await Vehicle.find({
      locationTrackingEnabled: true,
      "currentLocation.latitude": { $exists: true, $ne: null },
      "currentLocation.longitude": { $exists: true, $ne: null },
    }).sort({ "currentLocation.timestamp": -1 });

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details by phone number
app.get("/api/user/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const user = await Vehicle.findOne({ phoneNumber });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user data without sensitive information
    const userData = {
      phoneNumber: user.phoneNumber,
      vehicleId: user.vehicleId,
      name: user.fullName,
      registeredAt: user.registeredAt,
    };

    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vehicles", async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
