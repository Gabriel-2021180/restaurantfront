import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// 👇 AQUÍ AGREGAMOS "export" PARA QUE OTROS ARCHIVOS PUEDAN USARLO
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Extraemos la URL base de la variable de entorno, con un fallback
    const baseURL = import.meta.env.VITE_API_URL 
      ? new URL(import.meta.env.VITE_API_URL).origin 
      : 'http://localhost:3000';

    const newSocket = io(baseURL, {
      transports: ['websocket'],
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