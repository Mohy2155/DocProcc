## Why

This change initializes the user-facing web application required for interacting with the document processing system. A modern, reactive SPA (Single Page Application) is needed to handle rich interactions like drag-and-drop uploads, real-time polling of processing status, and complex data visualization (JSON viewer).

## What Changes

- Initialize a new React SPA inside the `frontend/` directory using Vite, TypeScript, and Tailwind CSS.
- Implement a drag-and-drop document upload interface.
- Add support for document type presets during upload.
- Implement direct-to-Supabase S3 upload via presigned PUT URLs, offloading upload bandwidth from the backend.
- Implement a polling state machine to track the document Retrieval process.
- Build a JSON viewer and export tools to inspect and extract processed document results.

## Capabilities

### New Capabilities
- `frontend/document-upload`: Handles the drag-and-drop interface, document type presets, and secure, direct-to-Supabase S3 file uploads using presigned URLs.
- `frontend/retrieval-viewer`: Manages the polling state machine for document processing status, and provides a JSON viewer and export capabilities for the extracted data.

### Modified Capabilities
None

## Impact

- Introduces a new `frontend/` directory containing the React SPA codebase.
- Adds new dependencies for React, Vite, TypeScript, Tailwind CSS, and state/fetching libraries (e.g., React Query or similar, if chosen in design).
- Relies on the backend to provide presigned URLs and polling endpoints.
