## Purpose

Manages the polling state machine for document processing status and provides an interactive JSON viewer with export tools for processed document results.

## ADDED Requirements

### Requirement: Polling state machine
The system SHALL poll the backend to track the retrieval and processing status of an uploaded document until a terminal state is reached.

#### Scenario: Document processing completes
- **WHEN** the system polls for document status
- **THEN** it updates the UI with the current status (e.g., pending, processing)
- **THEN** it stops polling once the status indicates success or failure

### Requirement: JSON viewer
The system SHALL display the processed document results in a structured, interactive JSON viewer.

#### Scenario: Viewing processed results
- **WHEN** the document processing succeeds
- **THEN** the system displays the returned document data in an interactive JSON viewer

### Requirement: Result export tools
The system SHALL provide functionality to export the processed document results.

#### Scenario: User exports data
- **WHEN** the user clicks the export button
- **THEN** the system downloads the processed JSON data as a file or copies it to the clipboard
