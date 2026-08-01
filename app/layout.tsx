import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Body/UI text.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-body",
});

// "Service starts:" label.
const label = localFont({
  src: "./fonts/Telma-Medium.otf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-label",
});

// The countdown digits.
const display = localFont({
  src: "./fonts/ClashDisplay-Bold.otf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "CW 2026 Countdown",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${label.variable} ${display.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
