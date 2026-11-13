import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketContext } from "./context/socket";
import VideoCallContext from "./context/video-call";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Huddle — Simple video calls",
    description:
        "Free, peer-to-peer group video calls with screen sharing. No account, no downloads — just create a room and share the link.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <SocketContext>
                    <VideoCallContext>{children}</VideoCallContext>
                </SocketContext>
            </body>
        </html>
    );
}
