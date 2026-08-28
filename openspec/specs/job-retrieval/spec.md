# job-retrieval Specification

## Purpose
Provides an HTTP API for clients to retrieve the final structured data and status of their document extraction tasks.

## Requirements

### Requirement: Retrieve task status
The system SHALL allow clients to look up their extraction task by its `task_id` and return the current processing state and any extracted data if available.

#### Scenario: Task lookup
- **WHEN** a GET request is made with a valid `task_id`
- **THEN** the system returns a 200 OK with the DynamoDB record (e.g., status `COMPLETED` and the JSON results)

### Requirement: Handle missing tasks
The system SHALL return an appropriate error when a client requests a `task_id` that does not exist.

#### Scenario: Invalid task ID
- **WHEN** a GET request is made with an unknown `task_id`
- **THEN** the system returns a 404 Not Found response
