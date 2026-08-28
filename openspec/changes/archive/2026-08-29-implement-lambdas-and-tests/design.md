## Context
See `proposal.md` - Why. The infrastructure is defined. Now we must implement the Python logic inside `src/handlers/worker.py` and `src/handlers/retrieval.py` using `boto3`, `google-genai`, and `pytest`.

## Goals / Non-Goals
**Goals:**
- Implement Lambda handlers with proper error handling and logging.
- Enforce structured JSON output using Gemini's new structured outputs feature.
- Strictly maintain a $0.00 footprint by aggressively deleting files from Supabase S3.

**Non-Goals:**
- Implementing the frontend client.

## Decisions

**Decision 1: Use `google-genai` Structured Outputs**
- *Rationale*: We must guarantee the LLM returns valid JSON without trailing markdown blocks or hallucinations. `response_schema` in the Gemini SDK enforces this at the API level.
- *Alternatives Considered*: Standard prompt engineering with "Return JSON only". Rejected because it is brittle and prone to parsing errors.

**Decision 2: Retry-Aware Supabase Deletion**
- *Rationale*: We have a hard constraint of 50MB storage on Supabase's free tier, so files must be deleted. However, a blanket `finally` block deletion would break SQS retries by deleting the file on the first transient error (e.g., Gemini timeout). Therefore, the Worker must check `ApproximateReceiveCount`. It deletes the file on success, or on failure ONLY if it's the final retry (attempt 3), ensuring we don't break retries but also don't bloat storage.
- *Alternatives Considered*: A blanket `finally` block (breaks retries). A CRON job (risks hitting 50MB limit during high burst usage).

**Decision 3: `moto` for testing DynamoDB/SQS**
- *Rationale*: We need an end-to-end test suite without deploying to AWS or incurring costs.
- *Alternatives Considered*: LocalStack. Rejected because it is heavy and requires Docker, whereas `moto` runs purely in Python memory for fast `pytest` runs.

## Risks / Trade-offs
- [Risk] Aggressive file deletion means failed extractions cannot be re-run easily by downloading the file again. → Mitigation: Acceptable trade-off for staying within the $0.00 constraint. Clients will need to re-upload if a job fails permanently.
