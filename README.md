# DocProcc

DocProcc is an event-driven serverless document intelligence engine that I designed with severe budget constraints to test my system design knowledge. It extracts unstructured text from PDFs via Python (`pypdf`) and structures it into validated JSON schemas using LLMs. It operates entirely on permanent free-tier primitives (AWS Always Free Tier, Cloudflare Pages & R2, and developer-tier LLM APIs) for **$0.00 execution cost forever** (with strict guardrails).

## Architecture Overview

```text
                                 +-----------------------+
                                  |     Cloudflare R2     |
                                  | Temporary PDF Storage |
                                  |  (100% S3-Compatible, |
                                  |   Always Free Forever)|
                                  +-----------------------+
                                    ^         |        ^
                   3. Direct Upload |         |        | DeleteObject
                (Presigned R2 PUT)  |         |        |
                                    |         | Get    |
+-------------------+               |         | Object |
|  Client Browser   | --------------+         |        |
| (Cloudflare Pages |                         v        |
|   Static SPA)     |                 +----------------+      +--------------+
+-------------------+                 | Worker Lambda  | ---> | External LLM |
   |   |          ^                   +----------------+      | (Structuring)|
   |   |          | 6. Poll Status            ^               +--------------+
   |   |          |    & Get Data             |
   |   |          |                           | 5. Batch Trigger
   | 1. POST /upload (Presign URL)            |
   | 4. POST /confirm (Trigger)       +----------------+
   v   v          |                   |   Amazon SQS   | -- (Max Retries) -> +-------------+
+-------------------+                 |  (Job Queue)   |                     |   SQS DLQ   |
| Lambda Function   | --------------->+----------------+                     +-------------+
| URLs              |   Enqueue Job           ^
+-------------------+                         |
   |              |                           |
   | Ingestion    | Retrieval                 |
   | Lambda       | Lambda                    |
   v              v                           |
+------------------------------------+        |
|          Amazon DynamoDB           | -------+ (State Updates)
| (Job State, Metadata, Results JSON)|
+------------------------------------+
   |
   +--- 2. Initialize Record (PENDING)
```


### Data Flow
1. Presigned Upload Authorization: Client issues POST /upload (with document_type) to Ingestion Lambda via Function URL.

2. State Creation: Ingestion Lambda writes a PENDING record to DynamoDB (storing task_id and document_type), generates a Cloudflare R2 Presigned PUT URL, and returns the URL and task_id to the client.

3. Direct Upload: Client uploads the raw PDF directly from the browser to Cloudflare R2 via the presigned URL (bypassing Lambda 6MB payload limits).

4. Job Enqueue (Confirm Upload): Upon successful upload, client issues POST /confirm with the task_id to the Ingestion Lambda, which then sends a message with the task_id to Amazon SQS to begin processing.

5. Text Extraction & LLM Structuring: SQS triggers Worker Lambda. The Worker extracts raw text from R2 via pypdf, fetches the target schema from DynamoDB using task_id, and queries an external LLM for structured JSON extraction.

6. State Finalization & Cleanup: Worker writes the structured JSON to DynamoDB (COMPLETED) and immediately executes delete_object against R2. (Failed jobs route to SQS DLQ after retries).

7. Retrieval: Client polls Retrieval Lambda (GET /status & GET /data) to fetch final results securely from DynamoDB.

### Cost Engineering & $0.00 Always-Free Guardrails

**Cloudflare Pages & R2**: Unlimited static hosting bandwidth; R2 provides 10 GB storage and 1,000,000 write operations/month free forever (zero 12-month expiration, zero API call micro-charges).

**AWS Lambda & Function URLs**: 1,000,000 requests & 400,000 GB-seconds/month (Always Free Tier).

**Amazon SQS**: 1,000,000 messages/month (Always Free Tier).

**Amazon DynamoDB**: 25 GB storage & 25 Provisioned WCU/RCU (~64.8M continuous operations/month capacity, Always Free Tier).

**AWS SSM**: Worker Lambda accesses LLM credentials via SSM SecureString. Because it defaults to the AWS Managed Key (alias/aws/ssm), KMS decryption API calls are completely free and do not count against Customer Managed Key limits. Credentials are still cached in memory for optimal Lambda performance.

**LLM Engine**: Developer free-tier endpoints (Google Gemini Flash / Groq) paired with pypdf text extraction to minimize token consumption.

### Tech Stack
**Frontend**: Cloudflare Pages (React / Static SPA)

**Backend**: Python 3.11, AWS Lambda (Function URLs), Amazon SQS, Amazon DynamoDB

**Storage**: Cloudflare R2 (S3-compatible object storage via boto3)

**IaC**: AWS SAM (Serverless Application Model)

**Secrets**: AWS Systems Manager (SSM) Parameter Store (Standard Tier - Free)

 ### Deployment
1. Store LLM Secret (SSM Parameter Store)
```Bash

aws ssm put-parameter \
    --name "/docprocc/llm_api_key" \
    --value "your-api-key" \
    --type SecureString
```

2. Backend (AWS SAM)
(Note: Ensure your SAM template injects Cloudflare R2 credentials to the Lambda environment variables, not the frontend).

```Bash
sam build
sam deploy --guided
```

3. Frontend (Cloudflare Pages)
## Local Development

```Bash

cd frontend

# Set API endpoints
echo "VITE_INGESTION_API_URL=<IngestionFunctionUrl>" > .env
echo "VITE_RETRIEVAL_API_URL=<RetrievalFunctionUrl>" >> .env

npm install
npm run dev

```


## Production Deployment

**Option A (GitHub Integration - Recommended)**: Connect your GitHub repository to Cloudflare Pages. In Settings > Environment variables, add VITE_INGESTION_API_URL and VITE_RETRIEVAL_API_URL.

**Option B (Wrangler CLI)**: 

```Bash
npm run build
npx wrangler pages deploy dist --project-name docprocc
```



