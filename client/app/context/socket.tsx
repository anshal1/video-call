"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const SocketProvider = createContext<{ socket: Socket | null }>({
  socket: null,
});

export const SocketContext = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<null | Socket>(null);

  useEffect(() => {
    const socketConnection = io(process.env.NEXT_PUBLIC_SIGNAL_SERVER);
    setSocket(socketConnection);
    return () => {
      socketConnection.disconnect();
    };
  }, []);

  return (
    <SocketProvider.Provider value={{ socket }}>
      {children}
    </SocketProvider.Provider>
  );
};

export const useSocket = () => {
  const { socket } = useContext(SocketProvider);
  return socket;
};
