## 1. Project Initialization

- [x] 1.1 Scaffold the React application in `frontend/` using Vite and the React+TypeScript template.
- [x] 1.2 Install and configure Tailwind CSS (including PostCSS and `tailwind.config.js`).
- [x] 1.3 Install necessary runtime dependencies: `react-dropzone`, `@tanstack/react-query`, and a JSON viewer library (e.g., `react-json-view`).

## 2. Document Upload Interface

- [x] 2.1 Create the document upload layout and add the `react-dropzone` drag-and-drop area.
- [x] 2.2 Implement the UI for selecting document type presets.
- [x] 2.3 Write the API utility to fetch the S3 presigned PUT URL from the backend.
- [x] 2.4 Implement the file upload logic using the presigned URL, integrating it with the dropzone component.

## 3. Retrieval Viewer & Polling

- [x] 3.1 Configure and wrap the application in the React Query provider.
- [x] 3.2 Implement a custom hook/query to poll the document processing status from the backend until a terminal state is reached.
- [x] 3.3 Build UI components to display the current processing status (e.g., pending, processing, error, success).
- [x] 3.4 Integrate the JSON viewer component to render the successful document processing results.
- [x] 3.5 Implement export functionality to download the JSON results or copy them to the clipboard.
