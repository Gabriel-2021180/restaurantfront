import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// Exportamos el Contexto
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useAuth(); // Obtenemos el usuario y su rol

  useEffect(() => {
    if (isAuthenticated && user) {
      // 1. Definir URL base (igual que tenías antes)
      const baseURL = import.meta.env.VITE_API_URL 
        ? new URL(import.meta.env.VITE_API_URL).origin 
        : 'http://localhost:3000';

      // 2. Conectar enviando ID y ROL (Lógica nueva)
      const newSocket = io(baseURL, {
        query: {
            userId: user.id,
            role: user.role?.name || 'invitado'
        },
        transports: ['websocket'],
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log(`🟢 Socket Conectado como ${user.role?.name || 'Usuario'}`);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    } else {
        // Si se desloguea, desconectamos
        if(socket) {
            socket.close();
            setSocket(null);
        }
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};


export const useSocket = () => useContext(SocketContext);