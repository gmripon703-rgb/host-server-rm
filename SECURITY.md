# Security Policy & Architecture Guarantees

## 1. Zero-Leakage Architecture Guarantee

NexusControl is built on the strict principle that **no storage provider secrets, Google OAuth keys, service account private keys, or backend tokens ever touch the browser or client-side JavaScript**.

```
Browser
  ↓ (HTTPS + Authorization: Bearer JWT)
Admin Web UI (React SPA)
  ↓ (Strict input validation & role checks)
Secure Backend / Serverless API (Node.js / Express)
  ↓ (Server-to-Server encrypted REST API)
Google Drive v3 REST API / Cloud Storage
```

- **Frontend Environment Variables**: Only public configuration is passed to Vite.
- **Server Credentials**: Stored solely in server environment variables or deployment secret managers (e.g. Google Secret Manager, Cloud Run Secrets, Render Environment Groups).
- **Masked Inspector**: The Admin panel provides a masked configuration inspector that confirms whether variables are set without ever reflecting raw values.

## 2. Authentication & Credential Storage

- Passwords are encrypted with individual cryptographic salts using **PBKDF2** (100,000 iterations of SHA-512).
- Session tokens are signed using **HMAC-SHA256** with server-side expiry validation.
- Role-based authorization: Only users with the `ADMIN` role can access storage configuration, users management, settings, and activity logs.

## 3. Storage Security Model

- By default, all uploaded files are tagged as `PRIVATE`.
- Unauthenticated requests cannot read, enumerate, or download files without a cryptographically verified token.
- Google Drive files are kept in an isolated application root folder (`AI-HOST`) rather than exposing entire user drives.

## 4. Reporting a Security Vulnerability

If you discover a potential vulnerability in NexusControl, please open a private security advisory on your private GitHub repository or contact your system administrator directly.
