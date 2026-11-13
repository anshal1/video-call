"use client";
import React, { useState } from "react";
import { MaximizeIcon, MinimizeIcon } from "./icons";

export default function Video({
    stream,
    label,
}: {
    stream: MediaStream | null;
    label?: string;
}) {
    const [fullScreen, setFullScreen] = useState(false);

    return (
        <div
            className={
                fullScreen ? "fixed inset-0 z-50 bg-black" : "relative w-full"
            }
        >
            <div
                className={`group relative overflow-hidden border border-white/10 bg-zinc-900 shadow-xl shadow-black/40 ${
                    fullScreen
                        ? "h-full w-full rounded-none border-0"
                        : "aspect-video rounded-2xl"
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
                    className="h-full w-full object-cover"
                />

                {/* Bottom overlay: label + fullscreen toggle */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3">
                    {label ? (
                        <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-medium text-zinc-100 backdrop-blur-sm">
                            {label}
                        </span>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        aria-label={
                            fullScreen ? "Exit fullscreen" : "Enter fullscreen"
                        }
                        onClick={() => setFullScreen((v) => !v)}
                        className="pointer-events-auto cursor-pointer rounded-full border border-white/10 bg-black/50 p-2 text-zinc-200 opacity-80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                    >
                        {fullScreen ? (
                            <MinimizeIcon size={16} />
                        ) : (
                            <MaximizeIcon size={16} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
