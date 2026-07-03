import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pensieve — Personal File Vault",
  description: "Single-user password-protected file vault on Google Drive.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white focus:border">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
