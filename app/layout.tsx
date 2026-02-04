import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";
import AuthProvider from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollabHack - Collaborative Hackathon Platform",
  description: "Real-time collaboration platform for hackathon teams",
};

import { Toaster } from "sonner";
import { ProfileSetup } from "@/components/profile/ProfileSetup";

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
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
          <ProfileSetup />
        </AuthProvider>
      </body>
    </html>
  );
}
