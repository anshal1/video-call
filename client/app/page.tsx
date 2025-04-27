"use client";
import { useRouter } from "next/navigation";
import React from "react";

export default function Home() {
  const router = useRouter();
  const handleJoinCall = () => {
    router.push(`/room/${Date.now()}`);
  };
  return (
    <div className="flex items-center justify-center h-screen flex-col gap-y-4">
      <p className="text-3xl font-medium">Currently, There is only one room</p>
      <button
        onClick={handleJoinCall}
        className="border px-6 py-1 rounded-2xl text-2xl cursor-pointer"
      >
        Join Room
      </button>
    </div>
  );
}
