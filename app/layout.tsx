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
