## Purpose
Defines the infrastructure-as-code required for deploying the serverless backend, including routing, queues, databases, and permissions.

## ADDED Requirements

### Requirement: Provision DynamoDB state table
The system SHALL provide a DynamoDB table named `DocProccJobs` with a primary key `task_id` (String) and Provisioned capacity (25 RCU / 25 WCU).

#### Scenario: Table initialization
- **WHEN** the SAM template is deployed
- **THEN** the `DocProccJobs` table is created with provisioned capacity

### Requirement: Provision SQS processing queues
The system SHALL provide an SQS queue for incoming jobs and a Dead Letter Queue (DLQ) for jobs that fail processing after a defined number of retries.

#### Scenario: Message exhaustion
- **WHEN** a message in the main processing queue fails to process beyond the `maxReceiveCount`
- **THEN** the system automatically moves the message to the DLQ

### Requirement: Expose Ingestion HTTP endpoint
The system SHALL provide a Lambda Function URL for the `IngestionFunction` with CORS configured to allow cross-origin requests.

#### Scenario: Client requests upload URL
- **WHEN** a client makes an HTTP POST request to the Ingestion Function URL
- **THEN** the `IngestionFunction` executes with appropriate IAM permissions to write to DynamoDB and publish to SQS

### Requirement: SQS triggers Worker Lambda
The system SHALL configure the `WorkerFunction` to be triggered by messages arriving on the main processing SQS queue.

#### Scenario: Job enqueue
- **WHEN** a new message is published to the SQS queue
- **THEN** the `WorkerFunction` is invoked with the message payload and executes with permissions to read/write DynamoDB, read from SQS, and access SSM parameters

### Requirement: Expose Retrieval HTTP endpoint
The system SHALL provide a Lambda Function URL for the `RetrievalFunction` with CORS configured to allow cross-origin requests.

#### Scenario: Client fetches job results
- **WHEN** a client makes an HTTP GET request to the Retrieval Function URL
- **THEN** the `RetrievalFunction` executes with appropriate IAM permissions to read from DynamoDB
