const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const { getDistance } = require("geolib");
require("dotenv").config();

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
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now },
  },
  isActive: { type: Boolean, default: true },
  isDriving: { type: Boolean, default: true },
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

// Store active connections
const activeConnections = new Map();

// Socket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register-vehicle", async (data) => {
    const { phoneNumber, vehicleId } = data;
    activeConnections.set(socket.id, { phoneNumber, vehicleId });

    // Update or create vehicle in database
    const vehicle = await Vehicle.findOneAndUpdate(
      { phoneNumber },
      { vehicleId, isActive: true },
      { upsert: true, new: true }
    );

    // Send updated vehicle list to all clients
    const allVehicles = await Vehicle.find({ isActive: true });
    io.emit("vehicles-update", allVehicles);

    socket.emit("registration-success", { phoneNumber, vehicleId });
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
        console.log(`Vehicle ${vehicle.vehicleId} driving status updated to: ${isDriving}`);
        
        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);
      }
    } catch (error) {
      console.error("Toggle driving error:", error);
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

  socket.on("location-update", async (data) => {
    const { phoneNumber, latitude, longitude } = data;

    console.log(
      `Location update received: ${phoneNumber} -> ${latitude}, ${longitude}`
    );

    try {
      // Update vehicle location
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        {
          currentLocation: { latitude, longitude, timestamp: new Date() },
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
  const DANGER_DISTANCE = 7; // 7 meter threshold

  try {
    // Only check collision if current vehicle has valid location data
    if (!currentVehicle.currentLocation || 
        !currentVehicle.currentLocation.latitude || 
        !currentVehicle.currentLocation.longitude) {
      console.log(`Vehicle ${currentVehicle.vehicleId} has no location data, skipping collision check`);
      return;
    }

    // Find other active vehicles with valid location data and are driving
    const allVehicles = await Vehicle.find({
      isActive: true,
      isDriving: true, // Only check collision with driving vehicles
      phoneNumber: { $ne: currentVehicle.phoneNumber },
      'currentLocation.latitude': { $exists: true, $ne: null },
      'currentLocation.longitude': { $exists: true, $ne: null }
    });

    // Also skip collision check if current vehicle is stopped
    if (!currentVehicle.isDriving) {
      console.log(`Vehicle ${currentVehicle.vehicleId} is stopped, skipping collision check`);
      return;
    }

    console.log(`Checking collision for ${currentVehicle.vehicleId} against ${allVehicles.length} other vehicles with location data`);

    for (const otherVehicle of allVehicles) {
      // Double-check that location data is valid
      if (otherVehicle.currentLocation.latitude && 
          otherVehicle.currentLocation.longitude) {
        
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
          `Vehicle ${currentVehicle.vehicleId} at: ${currentVehicle.currentLocation.latitude}, ${currentVehicle.currentLocation.longitude}`
        );
        console.log(
          `Vehicle ${otherVehicle.vehicleId} at: ${otherVehicle.currentLocation.latitude}, ${otherVehicle.currentLocation.longitude}`
        );
        console.log(
          `Distance between ${currentVehicle.vehicleId} and ${otherVehicle.vehicleId}: ${distance} meters`
        );

        // Check if distance is within danger threshold
        if (distance <= DANGER_DISTANCE) {
          const alertData = {
            type: "COLLISION_WARNING",
            distance: distance,
            vehicle1: {
              phoneNumber: currentVehicle.phoneNumber,
              vehicleId: currentVehicle.vehicleId,
              location: currentVehicle.currentLocation
            },
            vehicle2: {
              phoneNumber: otherVehicle.phoneNumber,
              vehicleId: otherVehicle.vehicleId,
              location: otherVehicle.currentLocation
            },
            timestamp: new Date(),
          };

          console.log(`🚨 COLLISION ALERT: ${distance}m between ${currentVehicle.vehicleId} and ${otherVehicle.vehicleId}`);

          // Send alert to all clients (broadcast collision warning)
          io.emit("collision-alert", alertData);
        }
      }
    }
  } catch (error) {
    console.error("Collision check error:", error);
  }
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
