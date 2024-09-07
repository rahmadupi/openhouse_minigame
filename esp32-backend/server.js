const express = require("express");
const cors = require("cors");
const SerialPort = require("serialport");
const { list } = require("serialport");

const app = express();
const port = 3001; // Backend server port

app.use(cors()); // Enable CORS
app.use(express.json());

let serialPort = null;
const COM_PORT = "COM5"; // Specify the manual port here
const BAUDRATE = 115200;
const TIMEOUT = 1000;

app.post("/connect", async (req, res) => {
  try {
    // Try to connect using the manual port
    serialPort = new SerialPort(COM_PORT, {
      baudRate: BAUDRATE,
      timeout: TIMEOUT,
    });

    // Listen for data from the ESP32
    serialPort.on("data", (data) => {
      console.log("Received from ESP32:", data.toString());
    });

    console.log("Connected to ESP32 at port:", COM_PORT); // Log successful connection
    return res.status(200).json({ message: "Connected to ESP32" });
  } catch (error) {
    console.error("Failed to connect to ESP32 on manual port:", error.message); // Log error message

    // Try to auto-detect the port
    try {
      const ports = await list();
      console.log("Available ports:", ports); // Log available ports
      for (const p of ports) {
        if (p.manufacturer && p.manufacturer.includes("USB") && p.vendorId === "0403") { // Adjust vendorId as needed
          serialPort = new SerialPort(p.path, {
            baudRate: BAUDRATE,
            timeout: TIMEOUT,
          });

          // Listen for data from the ESP32
          serialPort.on("data", (data) => {
            console.log("Received from ESP32:", data.toString());
          });

          console.log("Connected to ESP32 at port:", p.path); // Log successful connection
          return res.status(200).json({ message: "Connected to ESP32" });
        }
      }
      console.log("ESP32 not found"); // Log if ESP32 is not found
      return res.status(404).json({ message: "ESP32 not found" });
    } catch (error) {
      console.error("Failed to auto-detect and connect to ESP32:", error.message); // Log error message
      return res.status(500).json({ message: "Failed to connect to ESP32", error: error.message });
    }
  }
});

app.post("/disconnect", (req, res) => {
  if (serialPort) {
    serialPort.close();
    serialPort = null;
    console.log("Disconnected from ESP32"); // Log successful disconnection
    return res.status(200).json({ message: "Disconnected from ESP32" });
  }
  console.log("No ESP32 connected"); // Log if no ESP32 is connected
  return res.status(400).json({ message: "No ESP32 connected" });
});

app.post("/send", (req, res) => {
  const { data } = req.body;
  if (serialPort && serialPort.isOpen) {
    serialPort.write(data, (err) => {
      if (err) {
        console.error("Failed to send data to ESP32:", err.message);
        return res.status(500).json({ message: "Failed to send data to ESP32", error: err.message });
      }
      console.log("Data sent to ESP32:", data);
      return res.status(200).json({ message: "Data sent to ESP32" });
    });
  } else {
    console.log("No ESP32 connected or serial port not open");
    return res.status(400).json({ message: "No ESP32 connected or serial port not open" });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});