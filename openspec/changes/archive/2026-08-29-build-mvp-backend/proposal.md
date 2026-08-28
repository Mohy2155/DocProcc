## Why

The current DocProcc implementation consists of isolated proof-of-concept Python scripts. To function as an event-driven serverless system on AWS, we need to formally define the infrastructure blueprint. This change establishes the AWS Serverless Application Model (SAM) configuration to provision the necessary cloud resources and link them together, allowing the MVP backend to be tested and deployed.

## What Changes

- Create `template.yaml` defining the AWS SAM architecture.
- Provision a DynamoDB table (`DocProccJobs`) with Provisioned capacity (25 RCU / 25 WCU) to remain strictly within the Always Free Tier.
- Provision an SQS Queue for processing document jobs, accompanied by a Dead Letter Queue (DLQ) for failed jobs.
- Define three Lambda functions: `IngestionFunction`, `WorkerFunction`, and `RetrievalFunction`.
- Configure HTTP API (Function URLs) with CORS enabled for the `IngestionFunction` and `RetrievalFunction`.
- Configure an SQS event source trigger for the `WorkerFunction`.
- Grant appropriate IAM permissions to the Lambdas (e.g., DynamoDB read/write for Ingestion/Worker/Retrieval, SQS send for Ingestion, SQS receive/delete for Worker, and SSM Parameter Store read access for Worker).

## Capabilities

### New Capabilities
- `aws-sam-infrastructure`: Defines the infrastructure-as-code required for the serverless backend deployment and operation.

### Modified Capabilities
- (None)

## Impact

- **Infrastructure:** Establishes the foundational AWS resources for the project.
- **Development Workflow:** Enables deployment via `sam deploy` and local testing using AWS SAM CLI.
- **Code:** Python handlers (`ingestion.py`, `worker.py`, `retrieval.py`) will depend on the environment variables (`DYNAMODB_TABLE`, `SQS_QUEUE_URL`) defined in the template.
