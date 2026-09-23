import type { Metadata } from "next";
import "./globals.css";

// Loaded via <link> rather than next/font/google so the production build
// never depends on reaching fonts.googleapis.com at build time.
export const metadata: Metadata = {
  title: "Learning & Development Tracker",
  description: "Team roster, training plans, requests and growth reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
