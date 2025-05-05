"use client";
import React, { createContext, useContext, useState } from "react";

const VideoCallProvider = createContext<{
  room: string;
  setRoom: React.Dispatch<React.SetStateAction<string>>;
}>({ room: "", setRoom: () => {} });

export default function VideoCallContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [room, setRoom] = useState("");
  return (
    <VideoCallProvider.Provider value={{ room, setRoom }}>
      {children}
    </VideoCallProvider.Provider>
  );
}

export const useVideoCall = () => {
  return useContext(VideoCallProvider);
};
