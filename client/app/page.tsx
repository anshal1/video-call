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

  const handleCreatePeerConnections = useCallback(() => {
    const peer = new RTCPeerConnection();
    return peer;
  }, []);

  const handleCreateOffer = useCallback(async (peer: RTCPeerConnection) => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, []);

  const handleCreateAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit, peer: RTCPeerConnection) => {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    []
  );

  const handlePeerExists = useCallback(
    (socketId: string) => {
      return peerConnections.find((peer) => peer.socketId === socketId);
    },
    [peerConnections]
  );

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

  const handleCall = useCallback(
    async (socketId: string) => {
      if (handlePeerExists(socketId)) return;
      const peer = handleCreatePeerConnections();
      // add stream to the peer
      // in future create a function to create a dummy strea
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (!stream) return;
      await handleAddtrackToStream(peer, stream);
      const offer = await handleCreateOffer(peer);
      peerConnections.push({ peer, socketId });
      if (socket) {
        socket.emit("seding-offer", { offer, sendTo: socketId });
      }
      peer.addEventListener("icecandidate", (e) => {
        if (socket) {
          socket.emit("ice-candiate", e.candidate, socketId);
        }
      });
      peer.addEventListener("track", (e) => {
        const streamExists = remoteStreams.find(
          (stream) => stream.socketId === socketId
        );
        if (!streamExists) {
          remoteStreams.push({ stream: e.streams[0], socketId: socketId });
          setStreams([...remoteStreams]);
        }
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
    (socketId: string, answer: RTCSessionDescriptionInit) => {
      const peer = handlePeerExists(socketId);
      if (peer) {
        peer.peer.setRemoteDescription(answer);
      }
    },
    [handlePeerExists]
  );

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
    const handleCallAllUsers = (users: string[]) => {
      users.forEach(async (userId) => {
        await handleCall(userId);
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
      const peer = handleCreatePeerConnections();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      await handleAddtrackToStream(peer, stream);
      const answer = await handleCreateAnswer(offer, peer);
      peerConnections.push({ peer, socketId: sentBy });
      if (socket) {
        socket.emit("sending-answer", { answer, sentTo: sentBy });
      }
      peer.addEventListener("icecandidate", (e) => {
        if (socket) {
          socket.emit("ice-candiate", e.candidate, sentBy);
        }
      });
      peer.addEventListener("track", (e) => {
        const streamExists = remoteStreams.find(
          (stream) => stream.socketId === sentBy
        );
        if (!streamExists) {
          remoteStreams.push({ stream: e.streams[0], socketId: sentBy });
          setStreams([...remoteStreams]);
        }
      });
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
    handlePeerExists,
    peerConnections,
    remoteStreams,
    socket,
  ]);

  return (
    <main>
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
