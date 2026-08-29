# frontend/document-upload Specification

## Purpose
Provides the user interface for uploading documents via drag-and-drop, selecting document type presets, and performing secure, direct-to-Supabase S3 uploads via presigned URLs.

## Requirements

### Requirement: Drag-and-drop interface
The system SHALL provide a drag-and-drop zone for users to upload documents.

#### Scenario: User drops a valid file
- **WHEN** the user drags and drops a supported document file into the upload zone
- **THEN** the system accepts the file and prepares it for upload

### Requirement: Document type presets
The system SHALL allow users to select a document type preset before or during upload.

#### Scenario: User selects a preset
- **WHEN** the user selects a document type preset from the provided options
- **THEN** the system associates the selected document type with the uploaded file

### Requirement: Direct-to-Supabase S3 upload
The system SHALL upload files directly to Supabase S3 using presigned PUT URLs obtained from the backend.

#### Scenario: Successful upload
- **WHEN** the user initiates an upload
- **THEN** the system requests a presigned URL from the backend
- **THEN** the system uploads the file directly to the S3 bucket using the presigned URL
