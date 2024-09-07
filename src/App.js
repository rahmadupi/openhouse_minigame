import React, { useState, useEffect } from "react";
import "./App.css";

const parts = [
  ["1A", "1B", "1C", "1D"],
  ["2A", "2B", "2C", "2D"],
  ["3A", "3B", "3C", "3D"],
  ["4A", "4B", "4C", "4D"],
  ["5A", "5B", "5C", "5D"],
];

const max_select_count = 5;

function App() {
  const [port, setPort] = useState(null);
  const [currentPart, setCurrentPart] = useState(0);
  const [selectedButtons, setSelectedButtons] = useState([]);
  const [mostRecentButton, setMostRecentButton] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState("./assets/IDLE.mp4"); // Default video
  const [previewButton, setPreviewButton] = useState(null); // State to track the previewed button
  const [macIndexDest, setMacIndexDest] = useState(2); // State to track mac index destination
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [indices, setIndices] = useState([]); // State to store indices
  const [buttonNames, setButtonNames] = useState([]); // State to store button names
  const [countdown, setCountdown] = useState(null); // State for countdown
  const [isPlaying, setIsPlaying] = useState(false); // State for playing
  const [isConnected, setIsConnected] = useState(false); // State for connection status
  const [reader, setReader] = useState(null); // State to store the reader

  // const connect = async () => {
  //   try {
  //     // Request a serial port from the user
  //     const selectedport = await navigator.serial.requestPort();
  //     console.log("Port object after requestPort:", selectedport);

  //     if (!selectedport) {
  //       console.error("No port selected. Ensure you select a valid port.");
  //       return;
  //     }

  //     // Open the serial port with a specified baud rate
  //     await selectedport.open({ baudRate: 115200 });
  //     console.log("Port object after opening:", port);

  //     if (selectedport.writable) {
  //       setPort(selectedport);
  //       console.log("Port is writable and ready.");
  //       console.log("Port object after setting:", port);
  //       console.log("Port object after setting:", selectedport);
  //       const data_button = [0xfd, 0x00, 0xff, 0x01, 0x00];
  //       if (selectedport && selectedport.writable) {
  //         try {
  //           const writer = selectedport.writable.getWriter();
  //           const data = new Uint8Array(data_button);
  //           await writer.write(data);
  //           writer.releaseLock();
  //           console.log("Data sent to ESP32!");
  //         } catch (error) {
  //           console.error("Error writing to serial:", error);
  //         }
  //       } else {
  //         console.error("Port is not open");
  //       }
  //     }

  //     // Set the state indicating the connection is open
  //     setIsConnected(true);
  //     console.log("Connected to serial device!");
  //   } catch (error) {
  //     console.error("Error connecting to serial:", error);
  //   }
  // };

  // Send data to the serial device (ESP32)
  // const sendData = async () => {
  //   const data_button = [0xfd, 0x00, 0xff, 0x01, 0x00];
  //   if (port && port.writable) {
  //     try {
  //       const writer = port.writable.getWriter();
  //       const data = new Uint8Array(data_button);
  //       await writer.write(data);
  //       writer.releaseLock();
  //       console.log("Data sent to ESP32!");
  //     } catch (error) {
  //       console.error("Error writing to serial:", error);
  //     }
  //   } else {
  //     console.error("port is not open");
  //   }
  // };

  // // Read data from the serial device (ESP32)
  // const readData = async () => {
  //   try {
  //     const reader = port.readable.getReader();
  //     const decoder = new TextDecoderStream();
  //     decoder.readable.pipeTo(port.readable);
  //     while (true) {
  //       const { value, done } = await reader.read();
  //       if (done) {
  //         reader.releaseLock();
  //         break;
  //       }
  //       setData((prevData) => prevData + value);
  //       console.log("Data from ESP32:", value);
  //     }
  //   } catch (error) {
  //     console.error("Error reading from serial:", error);
  //   }
  // };

  // const disconnect = async () => {
  //   if (port) {
  //     try {
  //       await port.close();
  //       setPort(null);
  //       setIsConnected(false);
  //       console.log("Disconnected from serial device!");
  //     } catch (error) {
  //       console.error("Error closing the port:", error);
  //     }
  //   }
  // };

  const targetSequence = [0xfd, 0x00, 0x01, 0x01];
  let receivedBytes = [];

  // Compare the received bytes with the target sequence
  const compareByteSequence = (received, target) => {
    if (received.length !== target.length) return false;
    for (let i = 0; i < target.length; i++) {
      if (received[i] !== target[i]) return false;
    }
    return true;
  };

  const startCountdown = () => {
    setCountdown(5); // Set initial countdown value to 5
    let initMotionCalled = false;
    let playMotionCalled = false;

    const countdownInterval = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown === 3 && !initMotionCalled) {
          init_motion();
          initMotionCalled = true;
        }
        if (prevCountdown <= 1 && !playMotionCalled) {
          setIsPlaying(true);
          play_motion(); // Call play_motion when countdown finishes
          playMotionCalled = true;
          clearInterval(countdownInterval); // Clear the interval
          return 0; // Ensure countdown stops at 0
        }
        return prevCountdown - 1;
      });
    }, 1000);

    setTimeout(() => {
      setCountdown(null); // Set countdown to null after it stops
    }, 6000); // Set to null after 6 seconds to ensure it happens after the countdown
  };

  const handleConnectButtonClick = async () => {
    if (isConnected) {
      // Disconnect logic
      if (port) {
        await port.close();
        setPort(null);
        setIsConnected(false);
        console.log("Disconnected from serial device!");
      }
    } else {
      // Connect logic
      try {
        const port = await navigator.serial.requestPort(); // Request a port
        await port.open({ baudRate: 115200 }); // Open the serial port with the specified baud rate
        setPort(port); // Set the port to state
        setIsConnected(true);
        console.log("Serial port connected.");
      } catch (error) {
        console.error("Error connecting to serial:", error);
      }
    }
  };

  const sendData = async (data) => {
    // uint
    if (port && port.writable) {
      try {
        const writer = port.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        console.log("Binary data sent successfully.");
      } catch (error) {
        console.error("Error writing to serial:", error);
      }
    } else {
      console.error("Port is not open or writable.");
    }
  };

  const handleButtonClick = (button) => {
    if (previewButton === button) {
      // If the button is clicked again, select it
      setTimeout(() => {
        if (currentPart < parts.length - 1) {
          setSelectedButtons((prev) => [...prev, button]);
          setMostRecentButton(button);
          setCurrentPart((prev) => prev + 1);
          setSelectedVideo(`./assets/${button}.mp4`);
          setPreviewButton(null); // Reset the preview button
        } else if (!selectedButtons.includes(button)) {
          setSelectedButtons((prev) => [...prev, button]);
          setMostRecentButton(button);
          setSelectedVideo(`./assets/${button}.mp4`);
          setPreviewButton(null); // Reset the preview button
        }
      }, 100); // Delay in milliseconds (matching the CSS transition duration)
    } else {
      // If the button is clicked once, set it as the preview button
      setPreviewButton(button);
      setSelectedVideo(`./assets/${button}.mp4`);
    }
  };

  const handleRollback = () => {
    setSelectedButtons((prev) => {
      const newSelectedButtons = prev.filter((btn) => btn !== mostRecentButton);
      setMostRecentButton(
        newSelectedButtons[newSelectedButtons.length - 1] || null
      );
      setCurrentPart((prev) => {
        if (prev === 4 && selectedButtons.length === 5) {
          return 4; // Stay on the fifth part if rolling back from it
        } else {
          return prev > 0 ? prev - 1 : 0; // Roll back to the previous part
        }
      });
      setSelectedVideo(
        newSelectedButtons.length > 0
          ? `./assets/${newSelectedButtons[newSelectedButtons.length - 1]}.mp4`
          : "./assets/IDLE.mp4"
      );
      return newSelectedButtons;
    });
  };

  const handleVideoError = () => {
    setSelectedVideo("./assets/IDLE.mp4");
  };

  const handleMacIndexDestToggle = () => {
    setMacIndexDest((prev) => (prev === 2 ? 3 : 2));
  };

  const handlePlayButtonClick = () => {
    const indices = selectedButtons.map((button) => {
      for (let i = 0; i < parts.length; i++) {
        const index = parts[i].indexOf(button);
        if (index !== -1) {
          return i * parts[0].length + index;
        }
      }
      return -1; // Should not reach here if button is valid
    });
    setIndices(indices);
    console.log(indices);
    setButtonNames(selectedButtons);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const clearAllSelections = () => {
    setSelectedButtons([]);
    setMostRecentButton(null);
    setCurrentPart(0);
    setSelectedVideo("./assets/IDLE.mp4");
  };

  const init_motion = async () => {
    const dest = macIndexDest & 0xff; // Ensure macIndexDest is within Uint8 range
    const data = new Uint8Array([0xfd, 0x00, 0xff, 0x02, 0x09, dest]);
    sendData(data);
  };

  const set_motion = async () => {
    const dest = macIndexDest & 0xff; // Ensure macIndexDest is within Uint8 range
    const play_index = new Uint8Array(indices);
    // const play_index_length = 5 & 0xff;
    // const data_length = 7 & 0xff;
    const initialData = new Uint8Array([0xfd, 0x00, 0xff, 0x07, 0x03, 0x05]);
    const data = new Uint8Array(initialData.length + play_index.length);
    data.set(initialData);
    data.set(play_index, initialData.length);
    sendData(data);
    console.log("send motion:", data);
  };

  const play_motion = () => {
    const dest = macIndexDest & 0xff; // Ensure macIndexDest is within Uint8 range
    const data = new Uint8Array([0xfd, 0x00, 0xff, 0x02, 0x02, dest]);
    sendData(data);
    console.log("send play:", data);
  };

  const handleBeginButtonClick = () => {
    if (isPlaying) {
      setIsPlaying(false);
      init_motion();
      closeModal();
    } else {
      set_motion();
      startCountdown();
    }
  };

  // useEffect(() => {
  //   if (port && isPlaying) {
  //     const newReader = port.readable.getReader();
  //     setReader(newReader);

  //     const readLoop = async () => {
  //       let buffer = [];

  //       while (isPlaying) {
  //         const { value, done } = await newReader.read();
  //         if (done) {
  //           break;
  //         }
  //         if (value) {
  //           for (let i = 0; i < value.length; i++) {
  //             buffer.push(value[i]);

  //             // Check if buffer has at least 4 bytes
  //             if (buffer.length >= 4) {
  //               // Check for the specific byte sequence 0xfd 0x00 0x01 0x01
  //               if (
  //                 buffer[0] === 0xfd &&
  //                 buffer[1] === 0x00 &&
  //                 buffer[2] === 0x01 &&
  //                 buffer[3] === 0x01
  //               ) {
  //                 console.log("Filtered data:", buffer);
  //                 // Handle filtered data here
  //                 init_motion();

  //                 // Clear the buffer after processing
  //                 buffer = [];
  //               } else {
  //                 // Remove the first byte if the sequence does not match
  //                 buffer.shift();
  //               }
  //             }
  //           }
  //         }
  //       }
  //       newReader.releaseLock();
  //     };
  //     readLoop();
  //   }

  //   return () => {
  //     if (reader) {
  //       reader.releaseLock();
  //     }
  //   };
  // }, [port, isPlaying, reader, init_motion]);

  // useEffect(() => {
  //   let reader;
  //   let active = true;

  //   const listenToSerial = async () => {
  //     if (!port) return;

  //     try {
  //       const textDecoder = new TextDecoderStream();
  //       const readableStreamClosed = port.readable.pipeTo(textDecoder.writable); // Pipe the stream to the decoder
  //       reader = textDecoder.readable.getReader(); // Get the reader only once

  //       // Read loop
  //       while (active) {
  //         const { value, done } = await reader.read();
  //         if (done) {
  //           reader.releaseLock();
  //           break;
  //         }

  //         // Process each byte from the string value
  //         for (let i = 0; i < value.length; i++) {
  //           const byte = value.charCodeAt(i);
  //           receivedBytes.push(byte);

  //           // Keep only the last 4 bytes in the buffer
  //           if (receivedBytes.length > 4) {
  //             receivedBytes.shift();
  //           }

  //           // Check if the received bytes match the target sequence
  //           if (
  //             receivedBytes[0] === 0xfd &&
  //             receivedBytes[1] === 0x00 &&
  //             receivedBytes[2] === 0x01 &&
  //             receivedBytes[3] === 0x01
  //           ) {
  //             // console.log("Filtered data:",);
  //             // Handle filtered data here
  //             setIsPlaying(false);
  //             closeModal();

  //             // Clear the buffer after processing
  //             receivedBytes = [];
  //           } else {
  //             // Remove the first byte if the sequence does not match
  //             receivedBytes.shift();
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error reading from serial port:", error);
  //     }
  //   };

  //   if (isConnected) {
  //     listenToSerial();
  //   }

  //   // Cleanup when component unmounts or connection is closed
  //   return () => {
  //     active = false;
  //     if (reader) {
  //       reader.cancel();
  //       reader.releaseLock();
  //     }
  //   };
  // }, [port, isConnected]); // Runs only when `port` or `isConnected` changes

  return (
    <div className="main min-h-screen">
      <div className="main-container box">
        {/* Left Part */}
        <div className="left-part">
          {/* Logo */}
          <div className="logo mb-1">
            <img
              src={require("./assets/LOGO.png")}
              alt="logo"
              className="w-full h-full"
            />
          </div>
          {/* {Title} */}
          <h1 className="title mb-8 mt-8">Arrange Your Own Motion</h1>
          {/* Part Indicator */}
          <div className="flex justify-center items-center mb-5">
            <h2 className="text-3xl font-bold static_box">
              GROUP - {String.fromCharCode(65 + currentPart)}
            </h2>
          </div>
          {/* Upper Part with Buttons */}
          <div className="flex justify-center items-center mb-2">
            <div className="button-grid grid grid-cols-2">
              {parts[currentPart].map((button) => (
                <button
                  key={button}
                  className={`bg-blue-500 text-white py-4 px-20 bayangan ${
                    isConnected ? "button1" : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => handleButtonClick(button)}
                  disabled={!isConnected || selectedButtons.includes(button)}
                >
                  {button}
                </button>
              ))}
            </div>
          </div>
          {/* Lower Part with Selected Buttons and Submit Button */}
          <div className="flex gap-4 w-full ml-2">
            <div className="selected-buttons flex-grow">
              <div className="flex- wrap items-center relative">
                <span className="relative py-1 px-5 ">
                  <h2 className="static_box text-lg font-bold ml-2 mb-4">
                    SELECTED:
                    <button
                      className="absolute -top-1 -right-1 outline outline-5 outline-black bg-red-500 text-white rounded- w-4 h-4 flex items-center justify-center font-bold leading-none mt-1 button2 pt-1"
                      onClick={clearAllSelections}
                    >
                      &times;
                    </button>
                  </h2>
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedButtons.map((button, index) => (
                  <span
                    key={index}
                    className="bayangan selected-button-an relative bg-green-500 text-white py-1 px-5 outline outline-5 outline-black"
                  >
                    {button}
                    {button === mostRecentButton && (
                      <button
                        className="absolute -top-1 -right-1 outline outline-5 outline-black bg-red-500 text-white rounded- w-4 h-4 flex items-center justify-center font-bold leading-none pt-1 button2"
                        onClick={handleRollback}
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div className="submit-button flex-shrink-0 w-1/4 p-4 flex items-center justify-center">
              <button
                className={`py-3 px-6 ${
                  selectedButtons.length === max_select_count && isConnected
                    ? "bg-red-500 text-white bayangan cursor-pointer button1"
                    : "bg-red-500 text-white opacity-50 bayangan cursor-not-allowed"
                }`}
                disabled={selectedButtons.length !== max_select_count}
                onClick={handlePlayButtonClick}
              >
                Play
              </button>
            </div>
          </div>
          {/* New Buttons */}
          <div className="new-buttons flex gap-1 mt-2">
            <button
              className="bg-yellow-500 text-white py-2 px-4 bayangan button1"
              onClick={handleMacIndexDestToggle}
            >
              {macIndexDest === 2 ? "Nada" : "Rafa"}
            </button>
            <button
              className={`py-2 px-4 bayangan button1 ${
                isConnected
                  ? "bg-gray-500 text-white cursor-not-allowed opacity-50"
                  : "bg-yellow-500 text-white"
              }`}
              onClick={handleConnectButtonClick}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </button>
            <button
              className={`bg-yellow-500 text-white py-2 px-4 bayangan  ${
                isConnected ? "button1" : "opacity-50 cursor-not-allowed"
              }`}
              disabled={!isConnected}
              onClick={init_motion}
            >
              Init
            </button>
          </div>
        </div>
        {/* Right Part with Video Player */}
        <div className="right-part flex justify-center items-center">
          <div className="video h-full w-full background-image">
            {selectedVideo ? (
              <video
                key={selectedVideo}
                autoPlay
                className="vid-an"
                onError={handleVideoError}
                muted
              >
                <source src={require(`${selectedVideo}`)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <video autoPlay className="">
                <source src={require("./assets/IDLE.mp4")} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="modal-content bg-white p-6 rounded shadow-lg flex-col">
            {/* Countdown Message */}
            <div className="countdown-message">
              <h2 className="text-xl font-bold mb-5">
                {countdown !== null
                  ? `Start In: ${countdown} seconds`
                  : isPlaying
                  ? "<<< Playing >>>"
                  : "Start In: 5 seconds"}
              </h2>
            </div>
            {/* Begin/Stop Button */}
            <div className="mt-4 flex justify-center">
              <button
                className={`py-3 px-6 bg-red-500 text-white bayangan cursor-pointer button1 ${
                  countdown !== null ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={handleBeginButtonClick}
                disabled={countdown !== null}
              >
                {isPlaying ? "Stop" : "Begin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
