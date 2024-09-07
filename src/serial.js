import React, { createContext, useState, useContext } from "react";

const SerialPortContext = createContext();

export const useSerialPort = () => useContext(SerialPortContext);

export const SerialPortProvider = ({ children }) => {
  const [port, setPort] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    try {
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 115200 });
      setPort(selectedPort);
      setIsConnected(true);
      console.log("Connected to serial device!");
    } catch (error) {
      console.error("Error connecting to serial:", error);
    }
  };

  const disconnect = async () => {
    if (port) {
      await port.close();
      setPort(null);
      setIsConnected(false);
      console.log("Disconnected from serial device!");
    }
  };

  const sendData = async (data) => {
    if (port && port.writable) {
      try {
        const writer = port.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        console.log("Data sent to ESP32!");
      } catch (error) {
        console.error("Error writing to serial:", error);
      }
    } else {
      console.error("Port is not open");
    }
  };

  //   return (
  //     <SerialPortContext.Provider value={{ port, isConnected, connect, disconnect, sendData }}>
  //       {children}
  //     </SerialPortContext.Provider>
  //   );
};
