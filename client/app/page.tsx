"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useVideoCall } from "./context/video-call";

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const { setRoom } = useVideoCall();
  const handleJoinCall = () => {
    setRoom(roomName);
    router.push(`/room/${roomName}`);
  };
  return (
    <div className="flex items-center justify-center h-screen flex-col gap-y-4">
      <input
        type="text"
        className="border outline-none px-2 py-1 rounded-md"
        placeholder="Enter Room Name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <button
        onClick={handleJoinCall}
        className="border px-6 py-1 rounded-2xl lg:text-2xl cursor-pointer text-xl"
        disabled={!roomName}
      >
        Join Room
      </button>
    </div>
  );
}
