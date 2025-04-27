"use client";
import { useSocket } from "@/app/context/socket";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface Peers {
  peer: RTCPeerConnection;
  socketId: string;
}
interface RemoteStreams {
  stream: MediaStream;
  socketId: string;
}

export default function Room() {
  const peerConnections = useRef<Peers[]>([]);
  const remoteStreams = useRef<RemoteStreams[]>([]);
  const [streams, setStreams] = useState<RemoteStreams[]>([]);
  const socket = useSocket();
  const localStream = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<null | MediaStream>(null);
  const [cameraFeed, setCameraFeed] = useState<null | MediaStreamTrack>(null);
  const isCaller = useRef(false);
  const [isCamerOn, setIsCameraOn] = useState(false);

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
      resolve(new MediaStream([audio, dummyVideoStream.getVideoTracks()[0]]));
    });
  }, [handleGetDummyVideoTrack]);

  const handleCreatePeerConnections = useCallback(() => {
    const peer = new RTCPeerConnection();
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
    []
  );

  const handleCreateAnswer = useCallback(
    async (
      offer: RTCSessionDescriptionInit,
      peer: RTCPeerConnection,
      stream: MediaStream
    ) => {
      await peer.setRemoteDescription(offer);
      await handleAddtrackToStream(peer, stream);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    [handleAddtrackToStream]
  );

  const handlePeerExists = useCallback(
    (socketId: string) => {
      return peerConnections.current.find((peer) => peer.socketId === socketId);
    },
    [peerConnections]
  );

  const handleCall = useCallback(
    async (socketId: string, stream: MediaStream) => {
      if (handlePeerExists(socketId)) return;

      const peer = handleCreatePeerConnections();
      peerConnections.current.push({ peer, socketId });
      peer.addEventListener("icecandidate", (e) => {
        if (socket) {
          socket.emit("ice-candiate", e.candidate, socketId);
        }
      });
      peer.addEventListener("track", (e) => {
        console.log(e.streams);
        const streamExists = remoteStreams.current.find(
          (stream) => stream.socketId === socketId
        );
        if (!streamExists) {
          remoteStreams.current.push({
            stream: e.streams[0],
            socketId: socketId,
          });
          setStreams([...remoteStreams.current]);
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
      socket,
    ]
  );

  const handleAcceptAnswer = useCallback(
    async (socketId: string, answer: RTCSessionDescriptionInit) => {
      const peer = handlePeerExists(socketId);
      if (peer) {
        peer.peer.setRemoteDescription(answer);
      }
    },
    [handlePeerExists]
  );

  const handleTurnOnCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const videoTracks = stream.getVideoTracks()[0];
    if (!localStream.current) {
      localStream.current = stream;
      setStream(stream);
      setCameraFeed(videoTracks);
      return;
    }
    peerConnections.current.forEach(async (peer) => {
      const sender = peer.peer.getSenders();
      const videoSender = sender.find(
        (sender) => sender.track?.kind === videoTracks.kind
      );
      if (videoSender) {
        if (cameraFeed) {
          const dummStream = await handleDummyStream();
          const dummyVideoTrack = dummStream.getVideoTracks()[0];
          videoSender.replaceTrack(dummyVideoTrack);
          localStream.current?.getVideoTracks()[0].stop();
          localStream.current?.removeTrack(
            localStream.current.getVideoTracks()[0]
          );
          stream.getVideoTracks()[0].stop();
          localStream.current?.addTrack(dummyVideoTrack);
          setStream(new MediaStream(localStream.current!.getTracks()));
          setIsCameraOn(false);
          setCameraFeed(null);
        } else {
          videoSender.replaceTrack(videoTracks);
          localStream.current?.removeTrack(
            localStream.current.getVideoTracks()[0]
          );
          localStream.current?.addTrack(videoTracks);
          setStream(new MediaStream(localStream.current!.getTracks()));
          setCameraFeed(videoTracks);
          setIsCameraOn(true);
        }
      }
    });
  };

  useEffect(() => {
    console.log("Test");
    if (!socket) return;
    socket.emit("join-room");
    return () => {
      if (socket) {
        socket.off("join-room");
      }
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleCallAllUsers = async (users: string[]) => {
      if (!users.length) return;
      isCaller.current = true;
      const stream = await handleDummyStream();
      if (!localStream.current) localStream.current = stream;
      setStream(localStream.current);
      console.log(peerConnections.current);
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

      if (!localStream.current) localStream.current = stream;
      setStream(localStream.current);
      const peer = handleCreatePeerConnections();
      peerConnections.current.push({ peer, socketId: sentBy });
      peer.addEventListener("icecandidate", (e) => {
        if (socket) {
          socket.emit("ice-candiate", e.candidate, sentBy);
        }
      });
      peer.addEventListener("track", (e) => {
        console.log(e.streams);
        const streamExists = remoteStreams.current.find(
          (stream) => stream.socketId === sentBy
        );
        if (!streamExists) {
          remoteStreams.current.push({
            stream: e.streams[0],
            socketId: sentBy,
          });
          setStreams([...remoteStreams.current]);
        }
      });

      const answer = await handleCreateAnswer(offer, peer, localStream.current);

      if (socket) {
        socket.emit("sending-answer", { answer, sentTo: sentBy });
      }
    };
    const handleAddIceCandidate = async (
      iceCandiate: RTCIceCandidate | null,
      socketId: string
    ) => {
      const peer = handlePeerExists(socketId);
      if (peer) {
        if (iceCandiate) await peer.peer.addIceCandidate(iceCandiate);
      }
    };

    const handleRemoveUser = (socketId: string) => {
      peerConnections.current = peerConnections.current.filter(
        (peer) => peer.socketId !== socketId
      );
      remoteStreams.current = remoteStreams.current.filter(
        (stream) => stream.socketId !== socketId
      );
      setStreams([...remoteStreams.current]);
    };
    socket.on("all-users", handleCallAllUsers);
    socket.on("offer-received", handleOfferReceived);
    socket.on("answer-received", handleAcceptAnswer);
    socket.on("ice-candidate", handleAddIceCandidate);
    socket.on("user-left", handleRemoveUser);
    return () => {
      if (socket) {
        socket.off("all-users", handleCallAllUsers);
        socket.off("offer-received", handleOfferReceived);
        socket.off("answer-received", handleAcceptAnswer);
        socket.off("user-left", handleRemoveUser);
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
    peerConnections,
    remoteStreams,
    socket,
  ]);

  useEffect(() => {
    const peers = peerConnections;
    return () => {
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
        socket.emit("user-left");
      }
    };
  }, []);

  return (
    <>
      {/* <Link href={"/"}>Go Home</Link> */}
      {/* <button onClick={handleTurnOnCamera}>Turn On Camera</button> */}

      <main className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 relative h-screen overflow-y-auto p-3">
        <div className="w-[550px] h-[400px] rounded-2xl overflow-hidden">
          <video
            ref={(vid) => {
              if (vid) {
                vid.srcObject = stream;
              }
            }}
            autoPlay
            muted
            className="w-full h-full block object-fill bg-red-500"
          ></video>
        </div>
        {streams.map((stream) => {
          return (
            <div
              className="w-[550px] h-[500px] aspect-video"
              key={stream.socketId}
            >
              <video
                autoPlay
                ref={(vid) => {
                  if (vid) {
                    vid.srcObject = stream.stream;
                  }
                }}
                muted={false}
                className="w-full h-full"
              ></video>
            </div>
          );
        })}
        <div className="absolute bottom-0 left-0 w-full h-32 flex items-center justify-center gap-x-12">
          <button
            onClick={handleTurnOnCamera}
            className="cursor-pointer p-6 rounded-full border"
          >
            {isCamerOn ? (
              <Image
                src="/camera-on.png"
                alt="turn on camera"
                width={48}
                height={48}
              />
            ) : (
              <Image
                src="/camera-off.png"
                alt="turn on camera"
                width={48}
                height={48}
              />
            )}
          </button>
        </div>
      </main>
    </>
  );
}
