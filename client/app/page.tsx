"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./context/socket";

interface Peers {
  peer: RTCPeerConnection;
  socketId: string;
}
interface RemoteStreams {
  stream: MediaStream;
  socketId: string;
}

export default function Home() {
  const { current: peerConnections } = useRef<Peers[]>([]);
  const { current: remoteStreams } = useRef<RemoteStreams[]>([]);
  const [streams, setStreams] = useState<RemoteStreams[]>([]);
  const socket = useSocket();
  const localStream = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<null | MediaStream>(null);
  const [cameraFeed, setCameraFeed] = useState<null | MediaStreamTrack>(null);
  const isCaller = useRef(false);

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
      return peerConnections.find((peer) => peer.socketId === socketId);
    },
    [peerConnections]
  );

  const handleCall = useCallback(
    async (socketId: string, stream: MediaStream) => {
      if (handlePeerExists(socketId)) return;

      const peer = handleCreatePeerConnections();
      peer.addEventListener("track", (e) => {
        console.log(e.streams);
        const streamExists = remoteStreams.find(
          (stream) => stream.socketId === socketId
        );
        if (!streamExists) {
          remoteStreams.push({ stream: e.streams[0], socketId: socketId });
          setStreams([...remoteStreams]);
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
      peerConnections.push({ peer, socketId });
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
    if (!localStream.current) {
      localStream.current = stream;
      return;
    }
    const videoTracks = stream.getVideoTracks()[0];
    setCameraFeed(videoTracks);
    peerConnections.forEach(async (peer) => {
      const sender = peer.peer.getSenders();
      const videoSender = sender.find(
        (sender) => sender.track?.kind === videoTracks.kind
      );
      if (videoSender) {
        if (cameraFeed) {
          const dummStream = await handleDummyStream();
          const dummyVideoTrack = dummStream.getVideoTracks()[0];
          videoSender.replaceTrack(dummyVideoTrack);
          localStream.current?.removeTrack(
            localStream.current.getVideoTracks()[0]
          );
          localStream.current?.addTrack(dummyVideoTrack);
          setStream(new MediaStream(localStream.current!.getTracks()));
          setCameraFeed(videoTracks);
          setCameraFeed(null);
        } else {
          videoSender.replaceTrack(videoTracks);
          localStream.current?.removeTrack(
            localStream.current.getVideoTracks()[0]
          );
          localStream.current?.addTrack(videoTracks);
          setStream(new MediaStream(localStream.current!.getTracks()));
          setCameraFeed(videoTracks);
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
      peer.addEventListener("track", (e) => {
        console.log(e.streams);
        const streamExists = remoteStreams.find(
          (stream) => stream.socketId === sentBy
        );
        if (!streamExists) {
          remoteStreams.push({ stream: e.streams[0], socketId: sentBy });
          setStreams([...remoteStreams]);
        }
      });
      peer.addEventListener("icecandidate", (e) => {
        if (socket) {
          socket.emit("ice-candiate", e.candidate, sentBy);
        }
      });
      const answer = await handleCreateAnswer(offer, peer, localStream.current);
      peerConnections.push({ peer, socketId: sentBy });
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
    socket.on("all-users", handleCallAllUsers);
    socket.on("offer-received", handleOfferReceived);
    socket.on("answer-received", handleAcceptAnswer);
    socket.on("ice-candidate", handleAddIceCandidate);
    return () => {
      if (socket) {
        socket.off("all-users", handleCallAllUsers);
        socket.off("offer-received", handleOfferReceived);
        socket.off("answer-received", handleAcceptAnswer);
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

  return (
    <main>
      <button onClick={handleTurnOnCamera}>Turn On Camera</button>
      <video
        ref={(vid) => {
          if (vid) {
            vid.srcObject = stream;
          }
        }}
        className="border"
      ></video>
      {streams.map((stream) => {
        return (
          <div key={stream.socketId} className="h-80 aspect-video">
            <video
              playsInline
              autoPlay
              ref={(vid) => {
                if (vid) {
                  vid.srcObject = stream.stream;
                }
              }}
            ></video>
          </div>
        );
      })}
    </main>
  );
}
