# document-extraction Specification

## Purpose
Handles the background processing of uploaded documents, invoking the Gemini API for structured extraction, and cleaning up storage to minimize costs.

## Requirements

### Requirement: Process queued documents
The system SHALL poll the SQS queue, download the corresponding document from Supabase S3, extract its text using Gemini with a structured schema, and update the DynamoDB state to `PROCESSING` then `COMPLETED` with the results.

#### Scenario: Successful extraction
- **WHEN** a valid document job is received from SQS
- **THEN** the structured data is saved to DynamoDB and the document is successfully deleted from Supabase

### Requirement: Handle processing failures
The system SHALL catch processing exceptions (e.g., Gemini timeouts, invalid PDFs) and use retry-aware deletion logic to protect the 50MB Supabase storage limit while permitting SQS retries.

#### Scenario: Transient Gemini API timeout (Retryable)
- **WHEN** the extraction fails and `ApproximateReceiveCount` is less than 3
- **THEN** the system leaves the file in Supabase and raises an exception so SQS will retry

#### Scenario: Permanent failure (Max Retries Exhausted)
- **WHEN** the extraction fails and `ApproximateReceiveCount` is 3 (or greater)
- **THEN** the system updates DynamoDB to `FAILED` and deletes the document from Supabase to prevent storage bloat
