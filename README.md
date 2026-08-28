# DocProcc

DocProcc is an event-driven serverless document intelligence engine that I designed with severe budget constraints to test my system design knowledge. It extracts unstructured text from PDFs via Python (`pypdf`) and structures it into validated JSON schemas using LLMs. It operates entirely on permanent free-tier primitives (AWS Always Free Tier, Vercel, Supabase, and developer-tier LLM APIs) for **$0.00 execution cost forever** (with strict guardrails).

## Architecture Overview

```text
                                  +-----------------------+
                                  |   Supabase Storage    |
                                  | Temporary PDF Storage |
                                  |  (100% S3-Compatible) |
                                  |                       |
                                  +-----------------------+
                                    ^         |        ^
                   3. Direct Upload |         |        | DeleteObject
                (Presigned S3 PUT)  |         |        |
                                    |         | Get    |
+-------------------+               |         | Object |
|  Client Browser   | --------------+         |        |
|  (Vercel Hosted   |                         v        |
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

1. **Presigned Upload Authorization**: Client issues POST /upload (with document_type) to Ingestion Lambda via Function URL.
2. **State Creation**: Ingestion Lambda writes a PENDING record to DynamoDB (storing task_id and document_type), generates a Supabase Storage Presigned PUT URL, and returns the URL and task_id to the client.
3. **Direct Upload**: Client uploads the raw PDF directly from the browser to Supabase Storage via the presigned URL (bypassing Lambda 6MB payload limits).
4. **Job Enqueue (Confirm Upload)**: Upon successful upload, client issues POST /confirm with the task_id to the Ingestion Lambda, which then sends a message with the task_id to Amazon SQS to begin processing.
5. **Text Extraction & LLM Structuring**: SQS triggers Worker Lambda. The Worker extracts raw text from Supabase via pypdf, fetches the target schema from DynamoDB using task_id, and queries an external LLM for structured JSON extraction.
6. **State Finalization & Cleanup**: Worker writes the structured JSON to DynamoDB (COMPLETED) and immediately executes delete_object against Supabase. (Failed jobs route to SQS DLQ after retries).
7. **Retrieval**: Client polls Retrieval Lambda (GET /status & GET /data) to fetch final results securely from DynamoDB.


### Dynamic Schema Engine
DocProcc does not rely on fragile regular expressions or fixed templates. It adapts dynamically to any document layout:
* **Preset Taxonomies:** Built-in default field sets for standard categories (`INVOICE`, `RECEIPT`, `CONTRACT`, `RESUME`).
* **Custom Field Overrides:** Clients can pass any custom list of target keys (e.g., `["chassis_number", "shift_rate"]`) in the initial upload payload.
* **Autonomous Fallback:** When no schema is provided, the engine extracts all detectable key-value pairs and tabular data into clean nested JSON.


### Cost Engineering & $0.00 Always-Free Guardrails

**Vercel**: Unlimited static hosting bandwidth on the free tier. 

**Supabase Storage**: 1 GB storage and 2 GB bandwidth/month. Hard limits prevent overages. Completely S3 compatible.

**AWS Lambda & Function URLs**: 1,000,000 requests & 400,000 GB-seconds/month (Always Free Tier).

**Amazon SQS**: 1,000,000 messages/month (Always Free Tier).

**Amazon DynamoDB**: 25 GB storage & 25 Provisioned WCU/RCU (~64.8M continuous operations/month capacity, Always Free Tier).

**AWS SSM**: Worker Lambda accesses LLM credentials via SSM SecureString. Because it defaults to the AWS Managed Key (alias/aws/ssm), KMS decryption API calls are completely free and do not count against Customer Managed Key limits. Credentials are still cached in memory for optimal Lambda performance.

**LLM Engine**: Developer free-tier endpoints (Google Gemini Flash / Groq) paired with pypdf text extraction to minimize token consumption.

### Tech Stack
**Frontend**: Vercel (React / Static SPA)

**Backend**: Python 3.11, AWS Lambda (Function URLs), Amazon SQS, Amazon DynamoDB

**Storage**: Supabase Storage (S3-compatible object storage via boto3)

**IaC**: AWS SAM (Serverless Application Model)

**Secrets**: AWS Systems Manager (SSM) Parameter Store (Standard Tier - Free)

### Prerequisites

Ensure you have the following installed and configured:
* **Python 3.11+** installed (`python --version`).
* **Node.js 18+** & `npm` installed (`node -v`).
* **AWS CLI** installed and configured (`aws configure`).
* **AWS SAM CLI** installed (`sam --version`).
* **Google AI Studio API Key** (Free tier Gemini Flash key).
* **Supabase Account** with a Storage bucket and S3 credentials.

---

## Local Development & Testing

### 1. Create a virtual environment

```bash
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install development dependencies:

```bash
pip install -r requirements-dev.txt
```

### 2. Configure local secrets

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
SUPABASE_ACCESS_KEY_ID=YOUR_S3_ACCESS_KEY
SUPABASE_SECRET_ACCESS_KEY=YOUR_S3_SECRET_KEY
SUPABASE_BUCKET_NAME=docprocc-uploads
```

Do not commit `.env` or API keys to Git.

### 3. Run local extraction tests

```bash
python tests/test_extraction.py
```

## Cloud Deployment

### 1. Store the LLM secret

```bash
aws ssm put-parameter \
  --name "/docprocc/llm_api_key" \
  --value "your-api-key" \
  --type SecureString \
  --overwrite
```

Ensure the Lambda execution role has permission to read the specific parameter.

### 2. Configure Supabase Storage

Create the Supabase bucket and get the S3 credentials from the project settings. The S3 credentials should be injected into the Lambda backend configuration and must never be exposed to the frontend.

### 3. Deploy the AWS infrastructure

```bash
sam build
sam deploy --guided
```

The SAM template should provision/configure the required Lambda functions, Function URLs, SQS queue/DLQ, DynamoDB table, IAM permissions, and environment configuration.

## Local Frontend Development

From the frontend directory:

```bash
cd frontend

npm install
```

Configure the API endpoints in `.env`:

```env
VITE_INGESTION_API_URL=<IngestionFunctionUrl>
VITE_RETRIEVAL_API_URL=<RetrievalFunctionUrl>
```

Start the development server:

```bash
npm run dev
```

## Production Frontend Deployment

Connect the repository to Vercel and configure the frontend build settings and the following environment variables:

```text
VITE_INGESTION_API_URL
VITE_RETRIEVAL_API_URL
```
