## 1. Project Initialization

- [x] 1.1 Create `template.yaml` and initialize the standard AWS SAM Serverless Application structure (e.g. `AWSTemplateFormatVersion`, `Transform: AWS::Serverless-2016-10-31`).
- [x] 1.2 Add global function configurations (Runtime: python3.11, Timeout, MemorySize).

## 2. Provision Resources

- [x] 2.1 Add `DocProccJobsTable` resource (AWS::DynamoDB::Table) with `task_id` primary key and Provisioned throughput (25 ReadCapacityUnits, 25 WriteCapacityUnits).
- [x] 2.2 Add `ProcessingDLQ` resource (AWS::SQS::Queue) for failed jobs.
- [x] 2.3 Add `ProcessingQueue` resource (AWS::SQS::Queue) configured to route failed messages to `ProcessingDLQ` after a set `maxReceiveCount`.

## 3. Provision Lambda Functions

- [x] 3.1 Add `IngestionFunction` resource (AWS::Serverless::Function) with a Function URL (AuthType: NONE, CORS allowed). Environment variables: `DYNAMODB_TABLE`, `SQS_QUEUE_URL`, and Supabase keys (`SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_KEY_ID`, `SUPABASE_SECRET_ACCESS_KEY`, `SUPABASE_BUCKET_NAME`). IAM policies: DynamoDB write, SQS send.
- [x] 3.2 Add `WorkerFunction` resource (AWS::Serverless::Function) triggered by `ProcessingQueue` events. Environment variables: `DYNAMODB_TABLE`, and Supabase keys (`SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_KEY_ID`, `SUPABASE_SECRET_ACCESS_KEY`, `SUPABASE_BUCKET_NAME`). IAM policies: DynamoDB read/write, SQS consume/delete, SSM Parameter Store read.
- [x] 3.3 Add `RetrievalFunction` resource (AWS::Serverless::Function) with a Function URL (AuthType: NONE, CORS allowed), `DYNAMODB_TABLE` environment variable, and IAM policies for DynamoDB read.

## 4. Final Polish

- [x] 4.1 Define CloudFormation `Outputs` for the Ingestion and Retrieval Function URLs so they can be easily retrieved after deployment.
