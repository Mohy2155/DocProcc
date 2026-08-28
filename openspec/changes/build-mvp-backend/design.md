## Context

See `proposal.md` for the motivation. The current implementation relies on local execution of python scripts that mock cloud components. We need to define the AWS Serverless Application Model (SAM) `template.yaml` to orchestrate DynamoDB, SQS, and Lambda functions.

## Goals / Non-Goals

**Goals:**
- Define the AWS SAM template (`template.yaml`).
- Ensure all resources (DynamoDB, SQS, Lambdas) are logically connected.
- Secure resources using strict IAM roles.
- Expose the Ingestion and Retrieval Lambdas via Function URLs (bypassing API Gateway to save costs/complexity).

**Non-Goals:**
- Implementing the python code for the Lambdas (this change is strictly infrastructure definition).
- Configuring custom domain names for Function URLs.
- Implementing the frontend.

## Decisions

**Decision 1: Lambda Function URLs instead of API Gateway**
- *Rationale*: API Gateway adds significant overhead and potential costs if usage scales, while Function URLs are free and natively support CORS.
- *Alternatives Considered*: Amazon API Gateway HTTP API. Rejected due to the goal of maintaining a strict $0.00 footprint with minimal complexity.

**Decision 2: DynamoDB Provisioned Capacity (25 RCU / 25 WCU)**
- *Rationale*: The AWS Always Free Tier covers up to 25 WCU and 25 RCU of Provisioned Capacity. PAY_PER_REQUEST (On-Demand) incurs micro-charges per million requests. To maintain the strict $0.00 cost constraint, we must use Provisioned Capacity.
- *Alternatives Considered*: PAY_PER_REQUEST (On-Demand). Rejected because it voids the Always Free Tier for DynamoDB.

**Decision 3: SQS with DLQ**
- *Rationale*: Failed LLM extractions or PDF parsing timeouts should not block the queue. Moving them to a DLQ allows manual inspection or retry mechanisms later.

**Decision 4: SSM Parameter Store access**
- *Rationale*: The Gemini API key must be injected at runtime securely. SSM SecureString is free (when using default AWS KMS) and natively integrated with AWS IAM.

## Risks / Trade-offs

- [Risk] AWS Lambda Function URLs do not have native WAF or rate limiting like API Gateway. → Mitigation: Acceptable for MVP. Can be wrapped in Cloudflare later if DDoS protection is required.
