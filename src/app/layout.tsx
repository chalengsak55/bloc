import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloc | mybloc.me",
  description:
    "Bloc connects buyers to sellers in real time with an agent-like experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(120,80,255,0.18),transparent_60%),radial-gradient(900px_500px_at_10%_10%,rgba(30,255,200,0.10),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.92),rgba(0,0,0,0.97))] text-zinc-100 antialiased selection:bg-fuchsia-400/25 selection:text-zinc-50`}
      >
        {children}
      </body>
    </html>
  );
}
