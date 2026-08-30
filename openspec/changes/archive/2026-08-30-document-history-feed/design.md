## Context

See `proposal.md` for the motivation. To protect the AWS free tier while delivering a great UX, we use a hybrid approach: local persistence for immediate UX history, and optimized DynamoDB operations (like TTL) for backend cleanup.

## Goals / Non-Goals

**Goals:**
- Provide a persistent history of processed documents without any backend database reads for historic viewing.
- Implement a simple and clean UI in the frontend (`HistorySidebar.tsx`).
- Ensure history survives page reloads using browser `localStorage` (capped at 4 items).
- Provide a way to cancel in-flight jobs to save expensive LLM tokens.
- Ensure zero-cost automated backend cleanup.

**Non-Goals:**
- Cross-device syncing. (Because data is strictly in `localStorage`, a user's history is bound to their current browser/device).

## Decisions

**1. Client-Side Storage & Limits:**
- **Decision:** Use browser `localStorage` to save task results, capped at 4 items.
- **Rationale:** It costs nothing and provides instant data retrieval. A strict cap of 4 items prevents layout issues and forces active management via the UI. When 4 items exist, uploads are blocked via a Toast notification.

**2. Zero-Cost Backend Purging:**
- **Decision:** Use DynamoDB Time-to-Live (TTL).
- **Rationale:** TTL deletes expired records in the background without consuming Write Capacity Units (WCUs). This ensures zero cost while preventing the 25-WCU limit from being a bottleneck over time. Records are tagged to expire after 4 hours.

**3. True Job Cancellation:**
- **Decision:** Add a `/cancel` API that updates the DynamoDB status to `CANCELLED`, which the worker explicitly checks before calling Gemini.
- **Rationale:** Abandoning a poll on the frontend doesn't stop the AWS Lambda from executing an expensive 30-second LLM call. Adding 1 extra RCU check right before the LLM invocation saves significant AI API costs.

## Risks / Trade-offs

- **Risk:** Clearing browser data wipes the history.
  - **Mitigation:** Acceptable trade-off for a free-tier MVP. Users are explicitly informed that records are stored locally and purged from the server after 4 hours.
