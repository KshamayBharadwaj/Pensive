# Pensieve — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Development Specification  
**Product Type:** Single-user personal file vault  
**Primary Storage:** Google Drive  
**Metadata Database:** Supabase PostgreSQL  
**Application:** Next.js + TypeScript + Tailwind CSS  
**Deployment:** Vercel

## 1. Executive Summary

Pensieve is a private, single-user web application that provides a minimal custom interface for managing files stored in the user's Google Drive.

The goal is to let the user access personal files from any trusted computer through one password-protected web interface, without requiring the user to sign into Google on that computer.

Pensieve uses:

- Next.js for the application and server-side API layer.
- TypeScript for type safety.
- Tailwind CSS for the UI.
- Supabase PostgreSQL for metadata, folders, favorites, activity, and authentication data.
- Google Drive for the actual file contents.
- Vercel for deployment.

The application is intentionally not a full Google Drive replacement.

## 2. Product Vision

Create the simplest practical personal file-access system:

```text
Open Pensieve
      ↓
Unlock with password
      ↓
View files
      ↓
Search / upload / download / organize
      ↓
Done
```

The interface should be minimal, fast, responsive, and reliable.

## 3. Goals

Pensieve must allow the user to:

- Unlock the vault with one password.
- Access the vault from any computer with a browser.
- View all files.
- View recent files.
- Search files quickly.
- Create folders.
- Create nested folders.
- Upload files.
- Upload multiple files.
- Drag and drop files.
- Download files.
- Rename files.
- Move files.
- Delete files.
- Mark files and folders as favorites.
- Sort and filter files.
- View file details.
- Keep files at the root without requiring a folder.
