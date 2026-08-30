## 1. Frontend State & Storage

- [x] 1.1 Create a `useLocalHistory` React hook in `frontend/src/` to manage reading/writing `localStorage`, strictly limited to 4 items.
- [x] 1.2 Update `ResultViewer` polling in `App.tsx`: save to local history on `COMPLETED` or `FAILED`. Stop polling on `CANCELLED`.
- [x] 1.3 Add a limit check interceptor and a Toast notification to block uploads when the 4-item limit is reached.

## 2. Frontend UI Implementation

- [x] 2.1 Create `HistorySidebar.tsx` with dynamic auto-sizing (`h-auto`) to strictly fit up to 4 items without dead space. Add an individual `X` delete button to each item.
- [x] 2.2 Integrate `HistorySidebar` into `App.tsx` layout with `lg:sticky lg:self-start`.
- [x] 2.3 Implement the "Cancel Processing" button and disable the "Process Another" button during active polling.

## 3. Backend & Infrastructure

- [x] 3.1 Update `ingestion.py` to extract `file_name` and save `expires_at` (4 hours) into DynamoDB.
- [x] 3.2 Update `template.yaml` to enable `TimeToLiveSpecification` on the `DocProccJobsTable`.
- [x] 3.3 Add `POST /cancel` route in `ingestion.py` to flip job status to `CANCELLED`.
- [x] 3.4 Update `worker.py` to perform a late-stage DynamoDB read just before invoking the LLM, aborting if the status is `CANCELLED`.
- [x] 3.5 Fix `google` namespace import errors for Python 3.13 Lambda by injecting `__init__.py` during build.
