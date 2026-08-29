## Context

This design outlines the technical approach for the new frontend application. As detailed in `proposal.md`, we need a modern SPA to handle document uploads to S3, manage document type presets, and poll the backend for processing status.

## Goals / Non-Goals

**Goals:**
- Establish a robust, scalable React + Vite architecture using TypeScript.
- Implement efficient state management for file uploads and status polling.
- Ensure styling is consistent and easy to maintain using Tailwind CSS.

**Non-Goals:**
- Implementing authentication (unless specifically required by the backend endpoints, which is out of scope for this initial SPA initialization).
- Persistent frontend storage of historical document results beyond the active session.

## Decisions

### 1. Build Tooling & Framework
- **Decision:** Use React + Vite + TypeScript.
- **Rationale:** Vite provides excellent developer experience and fast build times compared to Create React App. TypeScript ensures type safety, which is crucial when dealing with complex JSON responses from the backend.

### 2. Styling
- **Decision:** Use Tailwind CSS.
- **Rationale:** Allows for rapid UI development and prototyping without writing custom CSS files. It's an industry standard for modern React applications.

### 3. File Upload & Drag-and-Drop
- **Decision:** Use `react-dropzone`.
- **Rationale:** Provides a highly customizable and accessible drag-and-drop zone out of the box, reducing boilerplate for file handling.

### 4. Data Fetching and Polling
- **Decision:** Use `@tanstack/react-query` (React Query).
- **Rationale:** React Query has built-in support for polling (`refetchInterval`) and handles loading/error states seamlessly, making the Retrieval state machine implementation straightforward.
- **Alternative Considered:** Vanilla `useEffect` with `setInterval`. Rejected because it requires more boilerplate to handle race conditions, cancellation, and caching.

### 5. JSON Viewer
- **Decision:** Use a lightweight library like `react-json-view` or similar.
- **Rationale:** Processing results can be deeply nested JSON. A dedicated viewer component provides folding, highlighting, and better readability than a raw `<pre>` tag.

### 6. Upload Strategy
- **Decision:** Two-step upload process.
- **Rationale:** 
  1. Frontend requests a presigned PUT URL from the backend.
  2. Frontend performs a `PUT` request directly to Supabase S3.
  This offloads the heavy lifting of file transfer from our backend to Supabase.

## Risks / Trade-offs

- **[Risk] CORS issues with S3 Uploads:** Directly uploading to S3 from the browser requires correct CORS configuration on the Supabase bucket.
  - *Mitigation:* Ensure backend/infrastructure documentation clearly states the required CORS settings for the Supabase S3 bucket.
- **[Risk] Polling Overhead:** Rapid polling could overwhelm the backend or frontend.
  - *Mitigation:* Use a sensible polling interval (e.g., 3-5 seconds) and implement exponential backoff if necessary. Stop polling immediately upon terminal state (success/error).
