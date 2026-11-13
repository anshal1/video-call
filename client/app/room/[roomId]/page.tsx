"use client";
import Video from "@/app/component/video";
import { useSocket } from "@/app/context/socket";
import { useVideoCall } from "@/app/context/video-call";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import {
    CheckIcon,
    CopyIcon,
    MicIcon,
    MicOffIcon,
    PhoneOffIcon,
    ScreenShareIcon,
    SwitchCameraIcon,
    UsersIcon,
    VideoIcon,
    VideoOffIcon,
} from "@/app/component/icons";

const controlBase =
    "flex h-12 w-12 sm:h-14 sm:w-14 cursor-pointer items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-indigo-400/50";
const controlOn = `${controlBase} border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10`;
const controlOff = `${controlBase} border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25`;

export default function Room() {
    const socket = useSocket();
    const {
        room,
        peerConnections,
        remoteStreams,
        streams,
        setStreams,
        localStream,
        stream,
        setStream,
        cameraFeed,
        setCameraFeed,
        rearCameraFeed,
        setRearCameraFeed,
        audioFeed,
        setAudioFeed,
        isCaller,
        isCamerOn,
        setIsCameraOn,
        isMicOn,
        setIsMicOn,
        isRearCameraOn,
        setIsRearCameraOn,
    } = useVideoCall();

    const { roomId }: { roomId: string } = useParams();
    const [copied, setCopied] = useState(false);

    let displayRoom = roomId;
    try {
        displayRoom = decodeURIComponent(roomId);
    } catch {
        // keep the raw param if it isn't valid percent-encoding
    }

    const handleCopyRoomLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard unavailable (e.g. non-secure context)
        }
    };

    const handleGetDummyVideoTrack = useCallback(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const dummyVideoStream = canvas.captureStream(10); // 10 fps
        return dummyVideoStream;
    }, []);

    const handleDummyStream = useCallback((): Promise<MediaStream> => {
        return new Promise((resolve) => {
            const AudioCTX = new AudioContext();
            const buffer = AudioCTX.createBuffer(1, 1, 22050); // 1 frame of silence
            const source = AudioCTX.createBufferSource();
            source.buffer = buffer;
            source.connect(AudioCTX.destination);
            source.start();

            const dst = AudioCTX.createMediaStreamDestination();
            source.connect(dst);
            const audio = dst.stream.getAudioTracks()[0];
            // Create a dummy video track (blank frame)
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            const dummyVideoStream = handleGetDummyVideoTrack();
            resolve(
                new MediaStream([audio, dummyVideoStream.getVideoTracks()[0]]),
            );
        });
    }, [handleGetDummyVideoTrack]);

    const handleCreatePeerConnections = useCallback(() => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        return peer;
    }, []);

    const handleCreateOffer = useCallback(async (peer: RTCPeerConnection) => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        return offer;
    }, []);

    const handleAddtrackToStream = useCallback(
        async (peer: RTCPeerConnection, stream: MediaStream) => {
            await new Promise((resolve) => {
                stream.getTracks().forEach((track) => {
                    peer.addTrack(track, stream);
                });
                resolve(true);
            });
        },
        [],
    );

    const handleCreateAnswer = useCallback(
        async (
            offer: RTCSessionDescriptionInit,
            peer: RTCPeerConnection,
            stream: MediaStream,
        ) => {
            await peer.setRemoteDescription(offer);
            await handleAddtrackToStream(peer, stream);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            return answer;
        },
        [handleAddtrackToStream],
    );

    const handlePeerExists = useCallback(
        (socketId: string) => {
            return peerConnections.current.find(
                (peer) => peer.socketId === socketId,
            );
        },
        [peerConnections],
    );

    const handleCall = useCallback(
        async (socketId: string, stream: MediaStream) => {
            if (handlePeerExists(socketId)) return;

            const peer = handleCreatePeerConnections();
            peerConnections.current.push({ peer, socketId });
            peer.addEventListener("track", (e) => {
                console.log(e.streams);
                const streamExists = remoteStreams.current.find(
                    (stream) => stream.socketId === socketId,
                );
                if (!streamExists) {
                    remoteStreams.current.push({
                        stream: e.streams[0],
                        socketId: socketId,
                    });
                    setStreams([...remoteStreams.current]);
                }
            });
            peer.addEventListener("icecandidate", (e) => {
                if (socket) {
                    socket.emit("ice-candiate", e.candidate, socketId);
                }
            });

            if (!stream) return;
            await handleAddtrackToStream(peer, stream);
            const offer = await handleCreateOffer(peer);
            if (socket) {
                socket.emit("seding-offer", { offer, sendTo: socketId });
            }

            peer.addEventListener("negotiationneeded", async () => {
                console.log("negotiationneeded");
            });
        },
        [
            handleAddtrackToStream,
            handleCreateOffer,
            handleCreatePeerConnections,
            handlePeerExists,
            peerConnections,
            remoteStreams,
            setStreams,
            socket,
        ],
    );

    const handleAcceptAnswer = useCallback(
        async (socketId: string, answer: RTCSessionDescriptionInit) => {
            const peer = handlePeerExists(socketId);
            if (peer && !peer.remoteDescription) {
                console.log("Accepting Answer");
                peer.remoteDescription = true;
                await peer.peer.setRemoteDescription(answer);
            }
        },
        [handlePeerExists],
    );

    const handleTurnOnCamera = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
        });
        const videoTracks = stream.getVideoTracks()[0];
        if (!localStream.current) {
            const dummyStream = await handleDummyStream();
            const newStream = new MediaStream([
                dummyStream.getAudioTracks()[0],
                videoTracks,
            ]);
            localStream.current = newStream;
            setStream(newStream);
            setCameraFeed(videoTracks);
            setRearCameraFeed(null);
            setIsCameraOn(true);
            return;
        }
        const dummStream = await handleDummyStream();
        const dummyVideoTrack = dummStream.getVideoTracks()[0];
        peerConnections.current.forEach((peer) => {
            const sender = peer.peer.getSenders();
            const videoSender = sender.find(
                (sender) => sender.track?.kind === videoTracks.kind,
            );
            console.log(videoSender);
            if (videoSender) {
                if (cameraFeed) {
                    videoSender.replaceTrack(dummyVideoTrack);
                } else {
                    videoSender.replaceTrack(videoTracks);
                }
            }
        });
        if (cameraFeed) {
            localStream.current?.getVideoTracks()[0].stop();
            localStream.current?.removeTrack(
                localStream.current.getVideoTracks()[0],
            );
            stream.getVideoTracks()[0].stop();
            localStream.current?.addTrack(dummyVideoTrack);
            setStream(new MediaStream(localStream.current!.getTracks()));
            setIsCameraOn(false);
            setRearCameraFeed(null);
            setCameraFeed(null);
        } else {
            localStream.current?.removeTrack(
                localStream.current.getVideoTracks()[0],
            );
            localStream.current?.addTrack(videoTracks);
            setStream(new MediaStream(localStream.current!.getTracks()));
            setCameraFeed(videoTracks);
            setRearCameraFeed(null);
            setIsCameraOn(true);
        }
    }, [
        cameraFeed,
        handleDummyStream,
        localStream,
        peerConnections,
        setCameraFeed,
        setIsCameraOn,
        setRearCameraFeed,
        setStream,
    ]);
    const handleTurnOnRearCamera = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });
        const videoTracks = stream.getVideoTracks()[0];
        if (!localStream.current) {
            const dummyStream = await handleDummyStream();
            const newStream = new MediaStream([
                dummyStream.getAudioTracks()[0],
                videoTracks,
            ]);
            localStream.current = newStream;
            setStream(newStream);
            setRearCameraFeed(videoTracks);
            setCameraFeed(null);
            setIsRearCameraOn(true);
            return;
        }
        const dummStream = await handleDummyStream();
        const dummyVideoTrack = dummStream.getVideoTracks()[0];
        peerConnections.current.forEach((peer) => {
            const sender = peer.peer.getSenders();
            const videoSender = sender.find(
                (sender) => sender.track?.kind === videoTracks.kind,
            );
            console.log(videoSender);
            if (videoSender) {
                if (rearCameraFeed) {
                    videoSender.replaceTrack(dummyVideoTrack);
                } else {
                    videoSender.replaceTrack(videoTracks);
                }
            }
        });
        if (rearCameraFeed) {
            localStream.current?.getVideoTracks()[0].stop();
            localStream.current?.removeTrack(
                localStream.current.getVideoTracks()[0],
            );
            stream.getVideoTracks()[0].stop();
            localStream.current?.addTrack(dummyVideoTrack);
            setStream(new MediaStream(localStream.current!.getTracks()));
            setIsRearCameraOn(false);
            setCameraFeed(null);
            setRearCameraFeed(null);
        } else {
            localStream.current?.removeTrack(
                localStream.current.getVideoTracks()[0],
            );
            localStream.current?.addTrack(videoTracks);
            setStream(new MediaStream(localStream.current!.getTracks()));
            setRearCameraFeed(videoTracks);
            setCameraFeed(null);
            setIsRearCameraOn(true);
        }
    }, [
        handleDummyStream,
        localStream,
        peerConnections,
        rearCameraFeed,
        setCameraFeed,
        setIsRearCameraOn,
        setRearCameraFeed,
        setStream,
    ]);

    const handleToggleMic = useCallback(async () => {
        const audio = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        });
        const dummyStream = await handleDummyStream();
        const audioTrack = audio.getAudioTracks()[0];
        if (!localStream.current) {
            console.log("No stream");
            const newStream = new MediaStream([
                audioTrack,
                dummyStream.getVideoTracks()[0],
            ]);
            setAudioFeed(audioTrack);
            localStream.current = newStream;
            setStream(newStream);
            setIsMicOn(true);
            return;
        }
        peerConnections.current.forEach((peer) => {
            const audioSender = peer.peer
                .getSenders()
                .find((sender) => sender.track?.kind === audioTrack.kind);
            if (!audioSender) return peer.peer.addTrack(audioTrack);
            if (audioFeed) {
                audioSender.replaceTrack(dummyStream.getAudioTracks()[0]);
            } else {
                audioSender.replaceTrack(audioTrack);
            }
        });
        if (audioFeed) {
            localStream.current.getAudioTracks()[0].stop();
            audio.getAudioTracks()[0].stop();
            localStream.current.removeTrack(
                localStream.current.getAudioTracks()[0],
            );
            localStream.current.addTrack(dummyStream.getAudioTracks()[0]);
            setStream(new MediaStream(localStream.current.getTracks()));
            setAudioFeed(null);
            setIsMicOn(false);
        } else {
            localStream.current.removeTrack(
                localStream.current.getAudioTracks()[0],
            );
            localStream.current.addTrack(audioTrack);
            setStream(new MediaStream(localStream.current.getTracks()));
            setAudioFeed(audioTrack);
            setIsMicOn(true);
        }
    }, [
        audioFeed,
        handleDummyStream,
        localStream,
        peerConnections,
        setAudioFeed,
        setIsMicOn,
        setStream,
    ]);

    const handleScreenShare = async () => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
        });
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach((peer) => {
            const sender = peer.peer.getSenders();
            const videoSender = sender.find(
                (sender) => sender.track?.kind === screenVideoTrack.kind,
            );
            if (videoSender) {
                videoSender.replaceTrack(screenVideoTrack);
            }
            localStream.current?.removeTrack(
                localStream.current.getVideoTracks()[0],
            );
            localStream.current?.addTrack(screenVideoTrack);
            setStream(new MediaStream(localStream.current!.getTracks()));
        });
        screenVideoTrack.onended = () => {
            peerConnections.current.forEach(async (peer) => {
                const sender = peer.peer.getSenders();
                const videoSender = sender.find(
                    (sender) => sender.track?.kind === screenVideoTrack.kind,
                );
                if (videoSender) {
                    if (cameraFeed) {
                        videoSender.replaceTrack(cameraFeed);
                        localStream.current?.removeTrack(
                            localStream.current.getVideoTracks()[0],
                        );
                        localStream.current?.addTrack(cameraFeed);
                        setStream(
                            new MediaStream(localStream.current!.getTracks()),
                        );
                    } else {
                        const dummyStream = await handleDummyStream();
                        const dummyVideoTrack = dummyStream.getVideoTracks()[0];
                        videoSender.replaceTrack(dummyVideoTrack);
                        localStream.current?.removeTrack(
                            localStream.current.getVideoTracks()[0],
                        );
                        localStream.current?.addTrack(dummyVideoTrack);
                        setStream(
                            new MediaStream(localStream.current!.getTracks()),
                        );
                    }
                }
            });
        };
    };

    useEffect(() => {
        if (!socket || !roomId) return;
        socket.emit("join-room", roomId);
        return () => {
            if (socket) {
                socket.off("join-room");
            }
        };
    }, [roomId, socket]);

    useEffect(() => {
        if (!socket) return;
        const handleCallAllUsers = async (users: string[]) => {
            if (!users.length) return;
            isCaller.current = true;
            const stream = await handleDummyStream();
            if (!localStream.current) localStream.current = stream;
            setStream(localStream.current);
            users.forEach(async (userId) => {
                await handleCall(userId, localStream.current!);
            });
        };
        const handleOfferReceived = async ({
            offer,
            sentBy,
        }: {
            offer: RTCSessionDescriptionInit;
            sentBy: string;
        }) => {
            if (handlePeerExists(sentBy)) return;
            const stream = await handleDummyStream();
            if (!localStream.current) {
                console.log("No stream found, creating a dummy stream");
                localStream.current = stream;
            }
            setStream(localStream.current);
            const peer = handleCreatePeerConnections();
            peerConnections.current.push({ peer, socketId: sentBy });
            peer.addEventListener("track", (e) => {
                console.log(e.streams);
                const streamExists = remoteStreams.current.find(
                    (stream) => stream.socketId === sentBy,
                );
                if (!streamExists) {
                    remoteStreams.current.push({
                        stream: e.streams[0],
                        socketId: sentBy,
                    });
                    setStreams([...remoteStreams.current]);
                }
            });
            peer.addEventListener("icecandidate", (e) => {
                if (socket) {
                    socket.emit("ice-candiate", e.candidate, sentBy);
                }
            });

            const answer = await handleCreateAnswer(
                offer,
                peer,
                localStream.current,
            );

            if (socket) {
                socket.emit("sending-answer", { answer, sentTo: sentBy });
            }
        };
        const handleAddIceCandidate = async (
            iceCandiate: RTCIceCandidate | null,
            socketId: string,
        ) => {
            const peer = handlePeerExists(socketId);
            if (peer) {
                if (iceCandiate) await peer.peer.addIceCandidate(iceCandiate);
            }
        };

        const handleRemoveUser = (socketId: string) => {
            peerConnections.current = peerConnections.current.filter(
                (peer) => peer.socketId !== socketId,
            );
            remoteStreams.current = remoteStreams.current.filter(
                (stream) => stream.socketId !== socketId,
            );
            setStreams([...remoteStreams.current]);
        };
        socket.on("all-users", handleCallAllUsers);
        socket.on("offer-received", handleOfferReceived);

        socket.on("ice-candidate", handleAddIceCandidate);
        socket.on("user-left", handleRemoveUser);
        return () => {
            if (socket) {
                socket.off("all-users", handleCallAllUsers);
                socket.off("offer-received", handleOfferReceived);
                socket.off("user-left", handleRemoveUser);
                socket.off("ice-candidate", handleAddIceCandidate);
            }
        };
    }, [
        handleAcceptAnswer,
        handleAddtrackToStream,
        handleCall,
        handleCreateAnswer,
        handleCreatePeerConnections,
        handleDummyStream,
        handlePeerExists,
        isCaller,
        localStream,
        peerConnections,
        remoteStreams,
        setStream,
        setStreams,
        socket,
    ]);

    useEffect(() => {
        if (socket) socket.on("answer-received", handleAcceptAnswer);
        return () => {
            if (socket) socket.off("answer-received", handleAcceptAnswer);
        };
    }, [handleAcceptAnswer, socket]);

    const handleCleanUp = () => {
        const peers = peerConnections;
        peers.current.forEach((peer) => {
            peer.peer.close();
        });
        peerConnections.current = [];
        remoteStreams.current = [];
        localStream.current?.getTracks().forEach((track) => {
            track.stop();
        });
        stream?.getTracks().forEach((track) => {
            track.stop();
        });
        setStreams([]);
        if (socket) {
            socket.emit("user-left", room);
        }
    };

    return (
        <main className="relative flex h-screen flex-col overflow-hidden bg-[#09090b] text-zinc-100">
            {/* Ambient glow */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl"
            />

            {/* Top bar */}
            <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
                <Link
                    href="/"
                    aria-label="Back to home"
                    className="flex shrink-0 items-center gap-2 text-zinc-300 transition hover:text-white"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
                        <VideoIcon size={16} />
                    </span>
                    <span className="hidden text-sm font-semibold tracking-tight sm:inline">
                        Huddle
                    </span>
                </Link>

                <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-4 pr-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <span className="truncate text-xs font-medium text-zinc-300 sm:text-sm">
                        {displayRoom}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopyRoomLink}
                        aria-label="Copy room link"
                        className="shrink-0 cursor-pointer rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                    >
                        {copied ? (
                            <CheckIcon size={14} className="text-emerald-400" />
                        ) : (
                            <CopyIcon size={14} />
                        )}
                    </button>
                </div>

                <div
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300"
                    title="Participants in this room"
                >
                    <UsersIcon size={14} />
                    <span>{streams.length + 1}</span>
                </div>
            </header>

            {/* Video grid */}
            <div className="thin-scroll relative z-0 flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-6 sm:pt-6">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    <Video stream={stream} label="You" />
                    {streams.map((stream) => {
                        return (
                            <div key={stream.socketId}>
                                <Video stream={stream.stream} label="Guest" />
                                <audio
                                    controls
                                    autoPlay
                                    className="hidden"
                                    ref={(aud) => {
                                        if (aud) {
                                            aud.srcObject = new MediaStream([
                                                stream.stream.getAudioTracks()[0],
                                            ]);
                                        }
                                    }}
                                ></audio>
                            </div>
                        );
                    })}
                </div>
                {streams.length === 0 && (
                    <div className="pointer-events-none mt-6 flex justify-center">
                        <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-xs text-zinc-400">
                            Waiting for others to join — share the room link
                            above
                        </p>
                    </div>
                )}
            </div>

            {/* Control bar */}
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-6">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl sm:gap-3 sm:p-2.5">
                    {!isRearCameraOn && (
                        <button
                            type="button"
                            onClick={handleTurnOnCamera}
                            aria-label={
                                isCamerOn ? "Turn off camera" : "Turn on camera"
                            }
                            aria-pressed={isCamerOn}
                            className={isCamerOn ? controlOn : controlOff}
                        >
                            {isCamerOn ? (
                                <VideoIcon size={20} />
                            ) : (
                                <VideoOffIcon size={20} />
                            )}
                        </button>
                    )}

                    {!isCamerOn && (
                        <button
                            type="button"
                            className={controlOn}
                            onClick={handleTurnOnRearCamera}
                            aria-label="Switch camera"
                        >
                            <SwitchCameraIcon size={20} />
                        </button>
                    )}

                    <button
                        type="button"
                        className={isMicOn ? controlOn : controlOff}
                        onClick={handleToggleMic}
                        aria-label={
                            isMicOn ? "Mute microphone" : "Unmute microphone"
                        }
                        aria-pressed={isMicOn}
                    >
                        {isMicOn ? (
                            <MicIcon size={20} />
                        ) : (
                            <MicOffIcon size={20} />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleScreenShare}
                        className={controlOn}
                        aria-label="Share screen"
                    >
                        <ScreenShareIcon size={20} />
                    </button>

                    <div aria-hidden className="mx-1 h-8 w-px bg-white/10" />

                    <Link
                        href="/"
                        onClick={handleCleanUp}
                        aria-label="Leave call"
                        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/50 sm:h-14 sm:w-14"
                    >
                        <PhoneOffIcon size={20} />
                    </Link>
                </div>
            </div>
        </main>
    );
}
