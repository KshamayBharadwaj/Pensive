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

## 4. Non-Goals

V1 does not include:

- Multiple users.
- User registration.
- Usernames.
- User profiles.
- Google OAuth as the Pensieve login.
- Public file sharing.
- Team collaboration.
- Native desktop/mobile apps.
- Offline synchronization.
- AI search.
- Complex enterprise permissions.
- Full Google Drive replacement.

## 5. Architecture

```text
                         ┌───────────────────────┐
                         │       Browser         │
                         │    Pensieve UI        │
                         └───────────┬───────────┘
                                     │ HTTPS
                                     ▼
                         ┌───────────────────────┐
                         │       Next.js         │
                         │ UI + Route Handlers   │
                         │ Authentication        │
                         └───────┬───────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌──────────────────┐       ┌──────────────────┐
          │ Supabase         │       │ Google Drive     │
          │ PostgreSQL       │       │ API              │
          │                  │       │                  │
          │ Password hash    │       │ Actual files     │
          │ File metadata    │       │ File contents    │
          │ Folder metadata  │       │ Drive folders    │
          │ Favorites        │       │                  │
          │ Activity         │       │                  │
          └──────────────────┘       └──────────────────┘
```

### Responsibility

**Next.js:** UI, authentication, sessions, validation, and coordination.

**Supabase:** metadata and application data.

**Google Drive:** actual file contents and storage.

Google Drive is the source of truth for actual file contents. Supabase is the source of truth for Pensieve-specific metadata.

## 6. Authentication

Pensieve uses a single password.

There is:

- No username.
- No registration.
- No social login.
- No multi-user system.

### Password storage

Never store the plaintext password.

Store only a strong password hash in Supabase PostgreSQL.

Recommended:

- Argon2id, preferred.
- bcrypt, acceptable.

The password is hashed server-side.

### First-time setup

On the first visit, the server checks whether a password hash exists.

```text
Application Open
       ↓
Is vault initialized?
    /             NO             YES
  ↓               ↓
Setup            Login
```

The setup screen contains:

- Password.
- Confirm password.
- Create Vault button.

Flow:

```text
Enter password
      ↓
Confirm password
      ↓
Validate
      ↓
Hash server-side
      ↓
Store hash in Supabase
      ↓
Initialize vault
      ↓
Create session
      ↓
Open Pensieve
```

The user must never manually generate or paste a password hash.

Once initialized, setup must be disabled server-side.

### Login

After initialization:

```text
Open Pensieve
      ↓
Check session
      ↓
Valid session?
  /          YES            NO
↓              ↓
Vault         Login
```

### Sessions

Use a secure server-side session represented by an HttpOnly cookie.

Requirements:

- HttpOnly.
- Secure in production.
- Appropriate SameSite policy.
- Expiration.
- Logout support.
- Session invalidation after password changes.

Do not store authentication credentials in localStorage.

### Password change

Authenticated users can change the password:

```text
Current password
      ↓
New password
      ↓
Confirm
      ↓
Verify current password
      ↓
Hash new password
      ↓
Store new hash
      ↓
Invalidate old sessions
      ↓
Login again
```

### Login protection

Implement basic rate limiting and increasing delays after repeated failed attempts.

## 7. Main UI

The design should be extremely minimal.

Avoid:

- Excessive shadows.
- Gradients.
- Glassmorphism.
- Decorative illustrations.
- Large cards.
- Excessive animation.
- Dashboard clutter.

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Pensieve                    Search...              + Upload │
├──────────────┬───────────────────────────────────────────────┤
│ All Files    │ Recent / Current Folder                       │
│ Recent       │                                               │
│ Favorites    │ Name              Size        Modified         │
│              │ ───────────────────────────────────────────── │
│ Folders      │ DBMS Notes.pdf    2.4 MB      Sep 28           │
│ ├ College    │ project.zip       84 MB       Sep 27           │
│ ├ Projects   │ report.xlsx       5 MB        Sep 26           │
│ └ Personal   │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

Use clean typography, subtle borders, whitespace, simple icons, and restrained colors.

## 8. Navigation

Sidebar:

```text
All Files
Recent
Favorites

Folders
├── College
├── Projects
├── Personal
└── Documents
```

Include a New Folder action.

On mobile, use compact navigation instead of a permanent sidebar.

## 9. All Files

The primary view supports:

- Root-level files.
- Folders.
- Nested folders.
- Upload.
- Search.
- Sort.
- Filter.
- File actions.
- Folder actions.

Example:

```text
Folders
📁 College
📁 Projects
📁 Documents

Files
📄 resume.pdf
📄 notes.txt
📦 backup.zip
```

Files do not have to belong to a folder.

## 10. Folder Management

Users can:

- Create folders.
- Rename folders.
- Delete folders.
- Open folders.
- Create nested folders.
- Move files into folders.
- Move files between folders.
- Favorite folders.

Use `parent_folder_id` for nested folders.

A null parent represents the root.

Folder deletion must never silently cause data loss.

## 11. Upload

Support:

- File picker.
- Multiple files.
- Drag and drop.

Upload flow:

```text
Browser
   ↓
Authenticated Next.js endpoint
   ↓
Google Drive API
   ↓
Upload succeeds
   ↓
Receive Google Drive file ID
   ↓
Save metadata in Supabase
```

Do not create a successful metadata record if the Google Drive upload fails.

Show progress for large files.

Example:

```text
Uploading project.zip

██████████████████░░ 87%

84 MB / 96 MB
```

## 12. Download

Flow:

```text
Click Download
      ↓
Verify session
      ↓
Find Supabase metadata
      ↓
Get Google Drive file ID
      ↓
Request file from Drive
      ↓
Stream/download
      ↓
Browser saves original filename
```

Never expose Google credentials to the browser.

## 13. Rename

Rename must update both:

1. Google Drive.
2. Supabase metadata.

Handle partial failures and reconciliation.

## 14. Move

Users can move files between folders.

The application must keep Google Drive folder relationships and Supabase folder metadata synchronized.

## 15. Favorites

Files and folders can be marked as favorites.

```text
☆ Add to favorites
★ Remove from favorites
```

Favorites are stored in Supabase and do not duplicate files in Drive.

## 16. Recent

Recent should include useful activity such as:

- Recently uploaded.
- Recently modified.
- Recently accessed through Pensieve.

Store recent activity in Supabase where useful.

## 17. Search

Search should primarily use Supabase metadata.

Search fields:

- Filename.
- Folder name.
- File type.
- Other indexed metadata where useful.

Do not query Google Drive on every keystroke.

Use:

- Indexed filename search initially.
- PostgreSQL full-text search or pg_trgm later if needed.

Search results should show the file's location.

## 18. Sorting

Support:

- Name.
- Modified date.
- Created date.
- Size.
- Type.

Support ascending and descending order.

## 19. Filtering

Useful filters:

- All.
- Documents.
- Images.
- Videos.
- Audio.
- Archives.
- Code.
- Favorites.

Keep filters lightweight.

## 20. File Details

Display:

```text
project.zip

Type
ZIP archive

Size
84.2 MB

Location
Projects / Web

Created
September 27, 2026

Modified
September 28, 2026

Actions
Download
Rename
Move
Favorite
Delete
```
