import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Conectar a tu Backend (Asumiendo puerto 3000)
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'], // Forzamos WebSocket para máxima velocidad
      autoConnect: true,
    });

    // Debug: Avisar si conectó
    newSocket.on('connect', () => {
      console.log("🟢 Socket Conectado:", newSocket.id);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);