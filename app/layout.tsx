import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DionFlix",
  description: "A cinematic anime and movie streaming platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://vidsrc.me" />
        <link rel="dns-prefetch" href="https://vidsrc.me" />
        <link rel="preconnect" href="https://vidsrc.net" />
        <link rel="dns-prefetch" href="https://vidsrc.net" />
        <link rel="preconnect" href="https://vidsrc.xyz" />
        <link rel="dns-prefetch" href="https://vidsrc.xyz" />
        <link rel="preconnect" href="https://vidlink.pro" />
        <link rel="dns-prefetch" href="https://vidlink.pro" />
        <link rel="preconnect" href="https://multiembed.mov" />
        <link rel="dns-prefetch" href="https://multiembed.mov" />
        <link rel="preconnect" href="https://superembed.stream" />
        <link rel="dns-prefetch" href="https://superembed.stream" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
      </head>
      <body className="bg-radial-vignette text-white antialiased">
        {children}
      </body>
    </html>
  );
}
