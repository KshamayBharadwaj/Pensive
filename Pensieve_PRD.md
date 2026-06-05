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

## 21. Delete

Prefer trash/soft deletion rather than permanent deletion.

Flow:

```text
Delete
  ↓
Verify session
  ↓
Move file to Google Drive trash
  ↓
Update Supabase metadata
```

Show confirmation before deletion.

## 22. Google Drive Integration

Use the official Google Drive API for:

- File listing.
- Upload.
- Download.
- Metadata retrieval.
- Rename.
- Move.
- Trash/delete.
- Folder creation.
- Folder metadata.
- Change tracking where practical.

Google Drive credentials must remain server-side.

The user should not need to sign into Google on every computer.

## 23. Synchronization

Pensieve must handle changes made directly in Google Drive.

Examples:

```text
Pensieve:
project.zip

Google Drive:
project.zip
notes.zip
```

A synchronization process should eventually discover `notes.zip`.

Synchronization should occur:

- On application refresh.
- When entering All Files where appropriate.
- After important mutations.
- Through Drive change tracking where practical.

### Source of truth

| Data | Source |
|---|---|
| File bytes | Google Drive |
| Drive file ID | Google Drive |
| File name | Google Drive, synced to Supabase |
| Folder relationship | Google Drive, synced to Supabase |
| Favorites | Supabase |
| Recent activity | Supabase |
| Password hash | Supabase |
| Sessions | Server/Supabase |

## 24. Database Schema

### `vault_settings`

```text
id
password_hash
created_at
updated_at
```

There should be only one active vault configuration.

### `files`

```text
id
google_drive_id
name
mime_type
size
folder_id
google_created_at
google_modified_at
created_at
updated_at
is_favorite
is_trashed
```

### `folders`

```text
id
google_drive_id
name
parent_folder_id
created_at
updated_at
is_favorite
is_trashed
```

### `sessions` (if server-side sessions are used)

```text
id
session_token_hash
expires_at
created_at
```

### `activity`

```text
id
file_id
action
created_at
```

Possible actions:

```text
UPLOAD
DOWNLOAD
OPEN
RENAME
MOVE
FAVORITE
UNFAVORITE
DELETE
```

Only record activity that provides actual value.

## 25. Database Indexes

Recommended indexes:

```text
files.google_drive_id
files.name
files.folder_id
files.is_favorite
files.is_trashed
files.google_modified_at

folders.google_drive_id
folders.parent_folder_id
folders.name

activity.file_id
activity.created_at
```

Add composite indexes only when actual query patterns justify them.

## 26. API Structure

Suggested routes:

```text
/api/auth/setup
/api/auth/login
/api/auth/logout
/api/auth/session
/api/auth/change-password

/api/files
/api/files/[id]
/api/files/[id]/download
/api/files/[id]/rename
/api/files/[id]/move
/api/files/[id]/favorite
/api/files/[id]/delete

/api/files/upload

/api/folders
/api/folders/[id]
/api/folders/[id]/rename
/api/folders/[id]/move
/api/folders/[id]/favorite
/api/folders/[id]/delete

/api/search
/api/sync
```

All protected endpoints must verify the session.

## 27. API Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "The requested file could not be found."
  }
}
```

Never expose stack traces or sensitive implementation details.

## 28. Validation

Validate server-side:

- Passwords.
- Folder names.
- File IDs.
- Search strings.
- Sort parameters.
- Filter parameters.
- Pagination parameters.

Never trust browser input.

## 29. Security Requirements

Required:

- HTTPS in production.
- Strong password hashing.
- HttpOnly cookies.
- Secure cookies.
- Appropriate SameSite policy.
- Server-side authentication.
- Server-side authorization.
- Rate limiting.
- Input validation.
- Secure environment variables.
- No credentials in source control.
- No server secrets in client bundles.

Never expose:

- Google client secret.
- Google refresh token.
- Supabase service-role key.
- Session secrets.

## 30. Environment Variables

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

SESSION_SECRET=
```

Only public configuration should use `NEXT_PUBLIC_*`.

Use Vercel Environment Variables for production secrets.

Do not commit `.env.local`.

## 31. Error Handling

Use user-friendly messages.

Examples:

```text
Unable to upload the file.
Please try again.
```

```text
Google Drive is currently unavailable.
Please try again later.
```

```text
Your session has expired.
Please unlock Pensieve again.
```

Never show raw exceptions.

## 32. Loading and Empty States

Examples:

```text
Loading files...
Searching...
Uploading...
Moving...
Deleting...
```

Empty states:

```text
No files yet.

Upload your first file to get started.

[ Upload File ]
```

```text
No favorites yet.

Star files and folders to find them quickly.
```

```text
No files found.

Try another search term.
```

## 33. Responsive Design

Desktop:

```text
Sidebar + file table
```

Tablet:

```text
Compact navigation + file list
```

Mobile:

```text
Header
Search
File list
Compact navigation
```

Do not rely on hover for essential controls.

## 34. Accessibility

The application should:

- Use semantic HTML.
- Support keyboard navigation.
- Provide visible focus states.
- Use accessible labels.
- Maintain sufficient contrast.
- Make dialogs keyboard accessible.
- Avoid unlabeled icon-only buttons.
- Use ARIA where necessary.

## 35. Performance

Priorities:

- Fast initial load.
- Minimal client JavaScript.
- Server Components where appropriate.
- Pagination.
- Debounced search.
- Avoid unnecessary Drive API calls.
- Stream large downloads where practical.
- Do not load thousands of files at once.

## 36. Suggested Project Structure

```text
pensieve/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── setup/
│   ├── files/[id]/
│   ├── settings/
│   └── api/
│       ├── auth/
│       ├── files/
│       ├── folders/
│       ├── search/
│       └── sync/
│
├── components/
│   ├── layout/
│   ├── auth/
│   ├── files/
│   ├── folders/
│   ├── search/
│   ├── dialogs/
│   └── ui/
│
├── lib/
│   ├── auth/
│   ├── google-drive/
│   ├── supabase/
│   ├── db/
│   ├── validation/
│   └── utils/
│
├── types/
├── supabase/
│   └── migrations/
├── public/
├── .env.local
├── .gitignore
├── package.json
└── README.md
```

## 37. Development Phases

### Phase 1 — Foundation

- Create Next.js project.
- Configure TypeScript.
- Configure Tailwind.
- Configure Supabase.
- Configure environment variables.
- Create base layout.

### Phase 2 — Authentication

- First-time setup.
- Password hashing.
- Login.
- Logout.
- Session management.
- Protected routes.
- Password change.

### Phase 3 — Google Drive

- Configure Drive API.
- Authenticate server-side.
- List files.
- Upload.
- Download.
- Rename.
- Trash/delete.

### Phase 4 — Metadata

- Create database schema.
- Store file metadata.
- Store folders.
- Store favorites.
- Store activity.
- Implement synchronization.

### Phase 5 — File Manager

- All Files.
- Root files.
- Folders.
- Nested folders.
- Move.
- Rename.
- Delete.

### Phase 6 — Organization

- Favorites.
- Recent.
- Search.
- Sorting.
- Filtering.

### Phase 7 — Polish

- Responsive design.
- Loading states.
- Empty states.
- Error handling.
- Accessibility.
- Keyboard support.

### Phase 8 — Deployment

- Vercel deployment.
- Production environment variables.
- Database migrations.
- Google Drive production configuration.
- End-to-end testing.
- Security review.
