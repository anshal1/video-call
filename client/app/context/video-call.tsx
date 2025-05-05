"use client";
import React, { createContext, useContext, useRef, useState } from "react";

interface Peers {
  peer: RTCPeerConnection;
  socketId: string;
  remoteDescription?: boolean;
}
interface RemoteStreams {
  stream: MediaStream;
  socketId: string;
}

const VideoCallProvider = createContext<{
  room: string;
  setRoom: React.Dispatch<React.SetStateAction<string>>;
  peerConnections: React.RefObject<Peers[]>;
  remoteStreams: React.RefObject<RemoteStreams[]>;
  streams: RemoteStreams[];
  setStreams: React.Dispatch<React.SetStateAction<RemoteStreams[]>>;
  localStream: React.RefObject<MediaStream | null>;
  stream: MediaStream | null;
  setStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  cameraFeed: MediaStreamTrack | null;
  setCameraFeed: React.Dispatch<React.SetStateAction<MediaStreamTrack | null>>;
  rearCameraFeed: MediaStreamTrack | null;
  setRearCameraFeed: React.Dispatch<
    React.SetStateAction<MediaStreamTrack | null>
  >;
  audioFeed: MediaStreamTrack | null;
  setAudioFeed: React.Dispatch<React.SetStateAction<MediaStreamTrack | null>>;
  isCaller: React.RefObject<boolean>;
  isCamerOn: boolean;
  setIsCameraOn: React.Dispatch<React.SetStateAction<boolean>>;
  isMicOn: boolean;
  setIsMicOn: React.Dispatch<React.SetStateAction<boolean>>;
  isRearCameraOn: boolean;
  setIsRearCameraOn: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  room: "",
  setRoom: () => {},
  peerConnections: { current: [] },
  remoteStreams: { current: [] },
  streams: [],
  setStreams: () => {},
  localStream: { current: null },
  stream: null,
  setStream: () => {},
  cameraFeed: null,
  setCameraFeed: () => {},
  rearCameraFeed: null,
  setRearCameraFeed: () => {},
  audioFeed: null,
  setAudioFeed: () => {},
  isCaller: { current: false },
  isCamerOn: false,
  setIsCameraOn: () => {},
  isMicOn: false,
  setIsMicOn: () => {},
  isRearCameraOn: false,
  setIsRearCameraOn: () => {},
});

export default function VideoCallContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const peerConnections = useRef<Peers[]>([]);
  const remoteStreams = useRef<RemoteStreams[]>([]);
  const [streams, setStreams] = useState<RemoteStreams[]>([]);
  const localStream = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<null | MediaStream>(null);
  const [cameraFeed, setCameraFeed] = useState<null | MediaStreamTrack>(null);
  const [rearCameraFeed, setRearCameraFeed] = useState<null | MediaStreamTrack>(
    null
  );
  const [audioFeed, setAudioFeed] = useState<null | MediaStreamTrack>(null);
  const isCaller = useRef(false);
  const [isCamerOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRearCameraOn, setIsRearCameraOn] = useState(false);
  const [room, setRoom] = useState("");
  return (
    <VideoCallProvider.Provider
      value={{
        room,
        setRoom,
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
      }}
    >
      {children}
    </VideoCallProvider.Provider>
  );
}

export const useVideoCall = () => {
  return useContext(VideoCallProvider);
};
