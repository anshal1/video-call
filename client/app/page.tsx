"use client";
import { useRouter } from "next/navigation";
import React from "react";

export default function Home() {
  const router = useRouter();
  const handleJoinCall = () => {
    router.push(`/room/${Date.now()}`);
  };
  return (
    <div className="flex items-center justify-center h-screen">
      <button onClick={handleJoinCall}>Join Call</button>
    </div>
  );
}
