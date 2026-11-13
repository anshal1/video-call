# Huddle — Peer-to-Peer Video Calling

## Features

- **Group video calls** — mesh-based peer-to-peer connections between all participants in a room
- **Screen sharing** — present your screen to the room with one click
- **Camera & microphone controls** — toggle audio/video mid-call with live track replacement
- **Rear camera support** — switch to the back camera on mobile devices
- **Instant rooms** — no sign-up or authentication; join any room by name
- **Responsive, minimal UI** — dark, modern interface that works on desktop and mobile
- **Copy room link** — share a room with a single click from inside the call

## Tech Stack

**Client**

- [Next.js](https://nextjs.org/) (App Router) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Socket.IO Client](https://socket.io/) for signaling
- Native WebRTC APIs (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`)

**Server**

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + TypeScript
- [Socket.IO](https://socket.io/) signaling server (room management, offer/answer/ICE relay)

## Architecture

```
┌──────────────┐        signaling (Socket.IO)        ┌──────────────┐
│   Client A   │ ◄─────────────────────────────────► │   Client B   │
│  (Next.js)   │                                     │  (Next.js)   │
└──────┬───────┘                                     └──────┬───────┘
       │                                                     │
       │            ┌──────────────────────┐                 │
       └──────────► │  Signaling Server    │ ◄───────────────┘
                    │  (Express + Socket.IO)│
                    └──────────────────────┘
       │                                                     │
       └──────────  WebRTC media (P2P mesh)  ────────────────┘
```

Media streams flow **directly between peers** (mesh topology); the server is used only for signaling — room membership, SDP offer/answer exchange, and ICE candidate relay.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Start the signaling server

```bash
cd server
npm install
npm run dev        # http://localhost:5000
```

### 2. Start the client

```bash
cd client
npm install
```

Create `client/.env.local`:

```bash
NEXT_PUBLIC_SIGNAL_SERVER=http://localhost:5000
```

Then run:

```bash
npm run dev        # http://localhost:3000
```

Open the app in two browser windows, join the same room name, and allow camera/microphone access.

### Production build

```bash
cd server && npm run build && npm start
cd client && npm run build && npm start
```

The server listens on `PORT` (defaults to `5000`).

## Project Structure

```
├── client/                 # Next.js frontend
│   └── app/
│       ├── page.tsx        # Landing page (create/join room)
│       ├── room/[roomId]/  # Call room (video grid + controls)
│       ├── component/      # Video tile, inline SVG icons
│       └── context/        # Socket.IO + WebRTC state (React context)
└── server/                 # Express + Socket.IO signaling server
    └── index.ts            # Room management, offer/answer/ICE relay
```

## Resume Highlights

- Built a real-time, peer-to-peer group video calling app with **WebRTC mesh networking**, handling SDP offer/answer negotiation and ICE candidate exchange over a custom **Socket.IO** signaling server
- Implemented **live track replacement** (camera on/off, mic mute, screen share, front/rear camera switch) without renegotiating connections from scratch
- Designed a **responsive, accessible dark UI** in Next.js + Tailwind CSS with keyboard-friendly forms, ARIA-labeled controls, and mobile-first layouts
- Architected a **monorepo** with a TypeScript Express signaling backend and a Next.js frontend, communicating over WebSockets

## License

ISC
