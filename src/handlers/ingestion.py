import json
import os
import uuid
import boto3
from botocore.config import Config

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "DocProccJobs")
QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "")
table = dynamodb.Table(TABLE_NAME)

# Supabase Storage (S3-Compatible) Configuration
SUPABASE_PROJECT_ID = os.environ.get("SUPABASE_PROJECT_ID", "")
SUPABASE_ACCESS_KEY_ID = os.environ.get("SUPABASE_ACCESS_KEY_ID", "")
SUPABASE_SECRET_ACCESS_KEY = os.environ.get("SUPABASE_SECRET_ACCESS_KEY", "")
SUPABASE_BUCKET_NAME = os.environ.get("SUPABASE_BUCKET_NAME", "docprocc-uploads")

s3_client = None


def get_s3_client():
  global s3_client
  if s3_client is None:
    endpoint = f"https://{SUPABASE_PROJECT_ID}.supabase.co/storage/v1/s3"
    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=SUPABASE_ACCESS_KEY_ID,
        aws_secret_access_key=SUPABASE_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
  return s3_client


def build_response(status_code: int, body: dict) -> dict:
  return {
      "statusCode": status_code,
      "headers": {
          "Content-Type": "application/json",
      },
      "body": json.dumps(body),
  }


import time

def handle_upload(body: dict) -> dict:
  document_type = body.get("document_type", "INVOICE")
  selected_fields = body.get("selected_fields", [])
  file_name = body.get("file_name", "Unknown Document")
  task_id = str(uuid.uuid4())
  storage_key = f"raw/{task_id}/document.pdf"
  expires_at = int(time.time()) + (4 * 3600)  # 4 hours

  # 1. Initialize PENDING state in DynamoDB
  table.put_item(
      Item={
          "task_id": task_id,
          "status": "PENDING",
          "document_type": document_type,
          "selected_fields": selected_fields,
          "storage_key": storage_key,
          "file_name": file_name,
          "expires_at": expires_at,
      }
  )

  # 2. Generate Supabase Storage Presigned PUT URL
  s3 = get_s3_client()
  presigned_url = s3.generate_presigned_url(
      ClientMethod="put_object",
      Params={
          "Bucket": SUPABASE_BUCKET_NAME,
          "Key": storage_key,
          "ContentType": "application/pdf",
      },
      ExpiresIn=300,  # 5 minutes
  )

  return build_response(
      200,
      {
          "task_id": task_id,
          "upload_url": presigned_url,
          "storage_key": storage_key,
      },
  )


def handle_confirm(body: dict) -> dict:
  task_id = body.get("task_id")
  if not task_id:
    return build_response(400, {"error": "task_id is required"})

  # Push job to SQS queue
  sqs.send_message(
      QueueUrl=QUEUE_URL,
      MessageBody=json.dumps({"task_id": task_id}),
  )

  return build_response(
      200,
      {
          "message": "Job enqueued successfully",
          "task_id": task_id,
          "status": "QUEUED",
      },
  )


def handle_cancel(body: dict) -> dict:
  task_id = body.get("task_id")
  if not task_id:
    return build_response(400, {"error": "task_id is required"})

  try:
    table.update_item(
        Key={"task_id": task_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "CANCELLED"}
    )
    return build_response(200, {"message": "Job cancelled successfully"})
  except Exception as e:
    return build_response(500, {"error": str(e)})

def lambda_handler(event: dict, context) -> dict:
  path = event.get("rawPath", "")
  raw_body = event.get("body", "{}")
  body = json.loads(raw_body) if raw_body else {}

  if path.endswith("/upload"):
    return handle_upload(body)
  elif path.endswith("/confirm"):
    return handle_confirm(body)
  elif path.endswith("/cancel"):
    return handle_cancel(body)

  return build_response(404, {"error": f"Route not found: {path}"})