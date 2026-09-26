# NexusControl — Private Web Hosting, Storage & AI Asset Control Panel

> A production-oriented, private web hosting and control-panel application designed to be published to a **private GitHub repository** and deployed to free-tier/serverless cloud infrastructure for a small personal or team admin website (1–10 users) with **zero requirement to rent or maintain a VPS**.

---

## Architecture & Security Boundary

```
[ Web Browser ]
      ↓  (HTTPS + Strict Session / JWT)
[ Admin Web UI (React + TypeScript + Tailwind CSS) ]
      ↓  (Proxied REST API — No Credentials in Browser)
[ Secure Backend API (Node.js / Express Serverless Container) ]
      ↓  (Server-to-Server Authentication)
[ Storage Provider Abstraction Layer ]
      ├── Google Drive v3 REST API (Isolated "AI-HOST" folder)
      ├── Local Persistent Disk (Docker / Volume fallback)
      └── Microsoft OneDrive / Dropbox Adapters
```

### Critical Security Rule
**Frontend JavaScript NEVER touches or exposes:**
* Google OAuth client secrets or refresh tokens
* Google Service Account private keys or JSON credentials
* Backend cryptographic keys or JWT secrets
* Telemetry passwords or administrative hashes

All communication with Google Drive and cloud storage is proxied strictly through the authenticated backend API.

---

## Key Features

1. **Real Authentication System**: Passwords hashed with individual cryptographic salts using **PBKDF2 (100,000 rounds of SHA-512)** and session authentication via signed **HMAC-SHA256**.
2. **Protected Admin Dashboard**: Overview metrics (storage quota, available pool, file counts, AI model assets, active team users, system health).
3. **Pluggable Storage Provider Abstraction**:
   - `GoogleDriveProvider`: Real Google Drive v3 REST API implementation supporting Service Account or OAuth2 refresh tokens.
   - `LocalDiskProvider`: Out-of-the-box zero-config local storage for container runtimes and local testing.
   - `OneDriveProvider` & `DropboxProvider`: Modular adapters adhering to `StorageProvider`.
4. **File Manager**: Folders, drag-and-drop upload with progress bar, download, delete, rename, search, sort, and customizable access policies (`PRIVATE`, `AUTHENTICATED`, `PUBLIC`).
5. **AI Model Registry**: Metadata catalog for on-device Android AI models (`GGUF`, `SafeTensors`, `ONNX`), quantization (`Q4_K_M`, `INT8`), SHA-256 verification, and RAM requirements.
6. **Android Client Integration**: Exposes `GET /api/models` and `GET /api/android/manifest` for mobile AI applications to query models and download weights securely without exposing storage credentials to the mobile device.
7. **APK Release Manager**: Catalog and distribute Android APK builds with version codes, release notes, SHA-256 hashes, and in-app update checks (`GET /api/apk/latest`).
8. **RBAC Team Management**: Strict `ADMIN` vs `USER` permission enforcement. Only Admins can modify storage, change providers, or manage users.
9. **Activity Audit Logs**: Immutable log trail of logins, uploads, deletions, role updates, and settings changes. Exportable to CSV and JSON.
10. **Zero VPS Requirement**: Containerized and stateless-ready for Google Cloud Run (Free Tier), Render, Railway, or Docker.

---

## 10-Step Setup & Deployment Manual

### 1. How to Create the Private GitHub Repository
1. Log into your GitHub account and navigate to [github.com/new](https://github.com/new).
2. Choose a repository name (e.g. `nexus-control-private`).
3. Select **Private** (Crucial: do not choose Public).
4. Leave "Add a README file" unchecked (this repository already provides one).
5. Click **Create repository**.

### 2. How to Push the Project to GitHub
Open your local terminal in the project directory:
```bash
# 1. Initialize git
git init

# 2. Stage files (Respects .gitignore — ignores .env and node_modules)
git add .

# 3. Create your initial commit
git commit -m "feat: complete NexusControl private panel codebase"

# 4. Link your private remote repository
git remote add origin git@github.com:YOUR_USERNAME/nexus-control-private.git

# 5. Push to main
git branch -M main
git push -u origin main
```

### 3. How to Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```
Key variables:
- `NODE_ENV`: Set to `production`.
- `PORT`: Default `3000`.
- `JWT_SECRET`: Generate a random 64-character hex string (`openssl rand -hex 32`).
- `ACTIVE_STORAGE_PROVIDER`: `google-drive` or `local-disk`.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Your GCP service account email.
- `GOOGLE_PRIVATE_KEY`: Your service account RSA private key in PEM format.
- `DEFAULT_ADMIN_EMAIL`: Initial admin login (default: `admin@nexus.internal`).
- `DEFAULT_ADMIN_PASSWORD`: Initial admin password (default: `Admin@Nexus2026!`).

### 4. How to Deploy the Frontend
The frontend is a React 19 SPA bundled by Vite into the `dist/` folder. In this unified full-stack architecture:
```bash
npm run build
```
The compiled HTML, CSS, and JS are automatically served by the Express backend at the root path (`/`). There is no separate frontend host required.

### 5. How to Deploy the Backend Without a VPS (Zero-VPS Cloud Run)
Google Cloud Run provides a generous free tier (2 million requests/month, 360,000 vCPU-seconds) that scales to zero when idle:

```bash
# 1. Install Google Cloud SDK and login
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Build the Docker container image via Cloud Build
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/nexus-control:latest

# 3. Deploy to Cloud Run
gcloud run deploy nexus-control \
  --image gcr.io/YOUR_GCP_PROJECT_ID/nexus-control:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,ACTIVE_STORAGE_PROVIDER=google-drive" \
  --set-secrets "JWT_SECRET=nexus-jwt-secret:latest,GOOGLE_SERVICE_ACCOUNT_EMAIL=nexus-drive-email:latest,GOOGLE_PRIVATE_KEY=nexus-drive-key:latest"
```

*Alternative (Render / Railway)*:
- Link your private GitHub repository in [Render.com](https://render.com) or [Railway.app](https://railway.app).
- Set Environment to **Docker** (Render detects the included `Dockerfile`).
- Add the environment variables from your `.env` in the platform dashboard.

### 6. How to Connect Google Drive
1. Go to the **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)).
2. Create or select your Google Cloud project.
3. Navigate to **APIs & Services → Library**, search for **Google Drive API**, and click **Enable**.
4. Go to **IAM & Admin → Service Accounts**:
   - Click **Create Service Account**.
   - Name it `nexus-drive-worker`.
   - Click **Keys → Add Key → Create new key → JSON**.
5. Open your Google Drive in your web browser:
   - Create a folder named **`AI-HOST`**.
   - Right-click the folder → **Share** → paste the Service Account email (e.g. `nexus-drive-worker@your-project.iam.gserviceaccount.com`) with **Editor** permissions.
6. Copy the private key and email from the downloaded JSON into your `.env` or paste them into the **Google Drive Setup Wizard** in the panel (`Storage → Google Drive Setup Wizard`).

### 7. How to Create the First Administrator
On first launch, NexusControl seeds a default administrator:
- **Email**: `admin@nexus.internal`
- **Password**: `Admin@Nexus2026!`

*(You can override these initial credentials by defining `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in your `.env` file prior to initial boot).*

Once logged in, navigate to **Users** to update your display name and reset your password.

### 8. How to Add Additional Users
1. Log in with an `ADMIN` account.
2. Click **Users** in the sidebar.
3. Click **Create User Account**.
4. Enter the user's name, email, password, and assign either:
   - **`USER`**: Can view and download files, test AI models, and download APKs.
   - **`ADMIN`**: Has full access to storage settings, credentials, user management, and activity logs.

### 9. How to Obtain the Final Admin URL
- **Cloud Run**: Upon deployment, Cloud Run prints your live service URL:
  `https://nexus-control-xxxx-uc.a.run.app`
- **Render**: Your URL is `https://nexus-control.onrender.com`.
- **Custom Domain**:
  1. In Cloud Run or Render, go to **Custom Domains → Add Domain**.
  2. Enter `admin.yourdomain.com`.
  3. Add the specified DNS `CNAME` record in your DNS provider (e.g. Cloudflare, Namecheap, Google Domains).
  4. SSL certificates are provisioned automatically.

### 10. How to Change Storage Providers
1. Log into the panel as an `ADMIN`.
2. Navigate to **Storage** in the sidebar.
3. Click **Set Active** on the desired provider card (e.g., switch between Google Drive and Local Persistent Storage).
4. Run **Test Connection** to verify latency and API connectivity.
5. All file operations immediately route through the newly active provider.

---

## Android Mobile Application Integration

Your future Android AI client application connects directly to the backend API without storing Google Drive keys on the device:

### 1. Fetch AI Model Manifest
```http
GET /api/models HTTP/1.1
Host: your-admin-url.com
```
Response:
```json
{
  "count": 2,
  "models": [
    {
      "id": "gemma-2-2b-it-q4",
      "name": "Gemma 2 2B Instruct",
      "format": "GGUF",
      "quantization": "Q4_K_M",
      "sizeBytes": 1650000000,
      "minRamGB": 3,
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "downloadUrl": "/api/models/gemma-2-2b-it-q4/download"
    }
  ]
}
```

### 2. Check for APK Updates
```http
GET /api/apk/latest HTTP/1.1
Host: your-admin-url.com
```

### 3. Universal Manifest Endpoint
```http
GET /api/android/manifest HTTP/1.1
Host: your-admin-url.com
```

---

## Local Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Express backend + Vite HMR)
npm run dev

# 3. Build frontend bundle for production
npm run build

# 4. Verify TypeScript compilation & linting
npm run lint

# 5. Start production server
npm run start
```

---

## Important Distinction Reminder

| Component | Responsibility |
|---|---|
| **GitHub** | Source code version control, private repository, and CI/CD workflows. |
| **Cloud Run / Container** | Hosts the web application and runs the secure backend API. |
| **Google Drive** | Provides raw file/model weight storage. It is **not** a VPS or web server. |
| **NexusControl UI** | The management interface that controls your storage and assets securely. |

---

## License
MIT License. Created for private team deployments.
