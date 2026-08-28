## Why

With the infrastructure defined and deployed via AWS SAM, the next step is to implement the core business logic for the MVP. We need to replace the local proof-of-concept scripts with production-grade Lambda handlers for processing documents and retrieving job status, ensuring they correctly interact with Supabase S3, Google Gemini, and DynamoDB. An end-to-end test suite is also required to prove reliability.

## What Changes

- Implement `src/handlers/worker.py` to handle SQS messages, fetch PDFs from Supabase, extract data via Gemini, update DynamoDB, and delete the file from Supabase upon completion.
- Implement `src/handlers/retrieval.py` to serve client requests for job status and extracted data from DynamoDB.
- Set up an end-to-end `pytest` suite for the `worker` and `retrieval` workflows.
- Introduce `google-genai` Structured Outputs (JSON Schema) to prevent LLM hallucinations.

## Capabilities

### New Capabilities
- `document-extraction`: The background processing of uploaded documents via LLMs.
- `job-retrieval`: The API capability for clients to fetch the status and results of their extraction jobs.

### Modified Capabilities
- (None)

## Impact

- **Code:** `src/handlers/worker.py` and `src/handlers/retrieval.py` will be fully implemented.
- **Dependencies:** `pytest` and required mocking libraries will be introduced for testing.
- **Behavior:** The system will now be capable of fully processing documents and cleaning up Supabase storage to maintain the $0.00 cost limit.
