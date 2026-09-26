# NexusControl REST API Documentation

All administrative endpoints require the `Authorization: Bearer <TOKEN>` header or a valid session cookie.

## Authentication Endpoints

### `POST /api/auth/login`
Authenticate with email and password.
- **Request Body**:
  ```json
  { "email": "admin@nexus.internal", "password": "..." }
  ```
- **Response 200**:
  ```json
  {
    "user": { "id": "usr_...", "email": "...", "name": "...", "role": "ADMIN" },
    "token": "eyJhbGciOi..."
  }
  ```

### `POST /api/auth/logout`
Revoke active session token.

### `GET /api/auth/me`
Retrieve profile of currently authenticated user.

---

## File & Storage Endpoints

### `GET /api/files`
List files in current folder.
- **Query Parameters**:
  - `folderId`: Folder ID (default: `root`)
  - `search`: Filter string by file name
  - `sortBy`: `name` | `modifiedAt` | `sizeBytes`
  - `sortOrder`: `asc` | `desc`

### `POST /api/files/upload`
Upload a new file to the active storage driver.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: Binary file payload (up to 500 MB)
  - `folderId`: Target folder ID
  - `visibility`: `PRIVATE` | `AUTHENTICATED` | `PUBLIC`

### `GET /api/files/:id`
Retrieve file metadata.

### `GET /api/files/:id/download`
Download file payload through the backend storage stream.

### `DELETE /api/files/:id`
Permanently delete file from the active storage driver.

### `PATCH /api/files/:id`
Rename file.

### `POST /api/folders`
Create a new directory/folder.
- **Body**: `{ "name": "folder-name", "parentFolderId": "root" }`

---

## Storage Provider Endpoints

### `GET /api/storage`
Retrieve active provider connection health, quota usage, and registered provider list.

### `POST /api/storage/switch-provider` *(ADMIN only)*
Switch active storage driver (`google-drive`, `local-disk`, `onedrive`, `dropbox`).

### `POST /api/storage/test-connection` *(ADMIN only)*
Execute a live ping and authentication check against the storage provider API.

### `POST /api/storage/configure-googledrive` *(ADMIN only)*
Dynamically update and verify Google Drive Service Account or OAuth keys.

---

## AI Models & Android Endpoints

### `GET /api/models`
Retrieve array of AI model asset metadata for web dashboard or Android AI edge app.

### `GET /api/models/:id/download`
Download model weights (GGUF, SafeTensors, ONNX) through authenticated backend proxy.

### `POST /api/models` *(ADMIN only)*
Register a new model record.

### `GET /api/android/manifest`
Universal manifest payload formatted for Android AI client app discovery.

---

## APK Distribution Endpoints

### `GET /api/apk`
List all published APK releases.

### `GET /api/apk/latest`
Returns metadata of the latest active APK release for in-app OTA update verification.

### `POST /api/apk` *(ADMIN only)*
Publish a new APK release.

---

## User Management Endpoints *(ADMIN only)*

### `GET /api/users`
List team user accounts.

### `POST /api/users`
Create a new user account with `ADMIN` or `USER` role.

### `PATCH /api/users/:id`
Update user name, role, active status, or reset password.

### `DELETE /api/users/:id`
Delete user account (protected against removing the last administrator).

---

## Activity & Audit Endpoints *(ADMIN only)*

### `GET /api/activity`
Filterable audit log stream.

### `GET /api/activity/export?format=csv|json`
Download complete audit log trail.
