"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useVideoCall } from "./context/video-call";
import {
    ArrowRightIcon,
    MonitorIcon,
    ShieldIcon,
    VideoIcon,
    ZapIcon,
} from "./component/icons";

const features = [
    {
        icon: ZapIcon,
        title: "Instant rooms",
        description: "Create a room and share the link — no sign-up required.",
    },
    {
        icon: ShieldIcon,
        title: "Peer-to-peer",
        description: "Audio and video flow directly between participants.",
    },
    {
        icon: MonitorIcon,
        title: "Screen sharing",
        description:
            "Present your screen with a single click, right in the call.",
    },
];

export default function Home() {
    const router = useRouter();
    const [roomName, setRoomName] = useState("");
    const { setRoom } = useVideoCall();

    const trimmedRoom = roomName.trim();

    const handleJoinCall = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!trimmedRoom) return;
        setRoom(trimmedRoom);
        router.push(`/room/${encodeURIComponent(trimmedRoom)}`);
    };

    return (
        <div className="dot-grid relative flex min-h-screen flex-col overflow-hidden bg-[#09090b] text-zinc-100">
            {/* Ambient glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[46rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-600/10 blur-3xl"
            />

            {/* Nav */}
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                        <VideoIcon size={18} strokeWidth={2.2} />
                    </span>
                    <span className="text-lg font-semibold tracking-tight">
                        Huddle
                    </span>
                </div>
                <span className="hidden rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-400 sm:inline-block">
                    No account needed
                </span>
            </header>

            {/* Hero */}
            <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-6 text-center sm:px-8 sm:pt-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    Free group video calls
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-6xl">
                    Face-to-face,
                    <br />
                    <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                        from anywhere.
                    </span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
                    Huddle is the fastest way to meet — create a room, share the
                    link, and talk. No downloads, no sign-ups.
                </p>

                {/* Join form */}
                <form
                    onSubmit={handleJoinCall}
                    className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row"
                >
                    <label htmlFor="room-name" className="sr-only">
                        Room name
                    </label>
                    <input
                        id="room-name"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="Enter a room name…"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!trimmedRoom}
                        className="group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                        Join room
                        <ArrowRightIcon
                            size={16}
                            className="transition-transform group-hover:translate-x-0.5"
                        />
                    </button>
                </form>
                <p className="mt-3 text-xs text-zinc-500">
                    Anyone with the room name can join — pick something unique.
                </p>

                {/* Features */}
                <div className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    {features.map(
                        ({ icon: FeatureIcon, title, description }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                            >
                                <FeatureIcon
                                    size={20}
                                    className="text-indigo-300"
                                />
                                <h2 className="mt-3 text-sm font-semibold text-zinc-100">
                                    {title}
                                </h2>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                    {description}
                                </p>
                            </div>
                        ),
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-4 text-center text-xs text-zinc-600">
                Huddle — open, peer-to-peer video calls
            </footer>
        </div>
    );
}
