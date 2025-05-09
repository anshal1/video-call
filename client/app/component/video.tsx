"use client";
import Image from "next/image";
import React, { useState } from "react";

export default function Video({ stream }: { stream: MediaStream | null }) {
  const [fullScreen, setFullScreen] = useState(false);
  return (
    <div
      className={`aspect-video rounded-md bg-black ${
        fullScreen
          ? "w-[100dvw] h-[100dvh] fixed z-100 top-0 left-0"
          : "w-full lg:w-100 relative"
      }`}
    >
      <video
        autoPlay
        muted
        ref={(ref) => {
          if (ref) {
            ref.srcObject = stream;
          }
        }}
        playsInline
        className={`w-full h-full object-fill border`}
      ></video>
      <div className="w-fit h-fit absolute bottom-0 right-2">
        {!fullScreen ? (
          <button
            className="cursor-pointer"
            onClick={() => {
              setFullScreen(true);
            }}
          >
            <Image src="/fullscreen.png" width={20} height={20} alt="" />
          </button>
        ) : (
          <button
            className="cursor-pointer"
            onClick={() => {
              setFullScreen(false);
            }}
          >
            <Image src="/normalscreen.png" width={20} height={20} alt="" />
          </button>
        )}
      </div>
    </div>
  );
}
