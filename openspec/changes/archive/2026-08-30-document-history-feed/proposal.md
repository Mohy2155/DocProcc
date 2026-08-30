## Why

DocProcc handles asynchronous document processing, but currently, users cannot view, inspect, or reload previous processing results once they navigate away. We need a persistent Document History feed to allow users to review past tasks without needing to re-upload documents, while strictly adhering to a zero-cost infrastructure model.

## What Changes

- Create a responsive, collapsible History Sidebar in the frontend to display statuses and timestamps.
- Implement a `localStorage`-backed React hook to save task results directly in the user's browser, strictly capped at a 4-item limit.
- Prevent new uploads with a toast notification when the local history limit is reached.
- Wire sidebar selection to populate the main `ResultViewer` with the locally cached extraction results.
- Add individual file deletion from the history feed.
- Add a Cancel Processing workflow to abort jobs in-flight.
- **Backend Changes**: Add `file_name` tracking and a 4-hour DynamoDB TTL policy for zero-cost auto-purging. Add a `/cancel` API route to mark jobs cancelled and halt the LLM Worker from processing them to save API tokens.

## Capabilities

### New Capabilities
- `document-history`: Defines the requirements for storing, displaying, and interacting with a browser-local historical feed of document processing tasks.
- `job-cancellation`: Defines the requirements for aborting asynchronous jobs mid-flight to conserve backend resources.

### Modified Capabilities
- (None)

## Impact

- **Frontend**: Addition of `HistorySidebar.tsx`, a `useLocalHistory` hook, toast notifications, UI cancellation components, and layout modifications in `App.tsx`.
- **Backend/Infrastructure**: Update `template.yaml` with a TTL configuration. Update `ingestion.py` to handle `/cancel` and store `expires_at`. Update `worker.py` to halt on `CANCELLED` status.
