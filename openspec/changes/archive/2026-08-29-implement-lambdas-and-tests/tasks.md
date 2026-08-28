## 1. Environment and Testing Setup
- [x] 1.1 Add required packages (`pytest`, `pytest-mock`, `moto`, `google-genai`) to the project dependencies.
- [x] 1.2 Create `tests/conftest.py` setting up `moto` fixtures for DynamoDB, S3, and SQS, ensuring tests run locally.

## 2. Worker Handler Implementation
- [x] 2.1 Refactor `src/handlers/worker.py` to parse SQS batch events and iterate over records.
- [x] 2.2 Implement S3 logic to download the PDF document from the Supabase endpoint.
- [x] 2.3 Implement the Gemini API call using `google-genai` and enforce a structured `response_schema`. Explicitly set the SDK timeout to 160s (shorter than Lambda's 180s) so it throws a catchable exception instead of causing a hard Lambda timeout, ensuring cleanup code always runs on the 3rd attempt.
- [x] 2.4 Add DynamoDB logic to transition the task from `PENDING` -> `PROCESSING`, and then to `COMPLETED` on success.
- [x] 2.5 Implement retry-aware deletion: Delete the Supabase file on success, OR if an exception occurs and `ApproximateReceiveCount` >= 3. If exception occurs and count < 3, raise it without deleting to allow SQS retry. If count >= 3, update DynamoDB to `FAILED`.

## 3. Retrieval Handler Implementation
- [x] 3.1 Refactor `src/handlers/retrieval.py` to accept Function URL events and extract `task_id` from query parameters.
- [x] 3.2 Query the DynamoDB table for the given `task_id`.
- [x] 3.3 Return a `200` JSON response with status/data, or a `404` response if the task does not exist.

## 4. Testing
- [x] 4.1 Write `tests/test_worker.py` to verify end-to-end processing (SQS read, DynamoDB update, S3 deletion).
- [x] 4.2 Write `tests/test_retrieval.py` to verify successful data lookup and 404 error handling.
