import os
import json
import boto3
from botocore.config import Config
from google import genai
from google.genai import types
from pydantic import BaseModel, create_model
from typing import Optional
from pypdf import PdfReader

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "DocProccJobs")
table = dynamodb.Table(TABLE_NAME)

ssm = boto3.client('ssm')
SSM_PARAM_NAME = os.environ.get("SSM_PARAM_NAME", "/docprocc/llm_api_key")

# Supabase Storage Configuration
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

def get_gemini_key():
    if "GEMINI_API_KEY" in os.environ:
        return os.environ["GEMINI_API_KEY"]
    try:
        response = ssm.get_parameter(Name=SSM_PARAM_NAME, WithDecryption=True)
        return response['Parameter']['Value']
    except Exception:
        return None

def extract_text_from_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")
    reader = PdfReader(pdf_path)
    extracted_pages = []
    for index, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            extracted_pages.append(f"--- Page {index + 1} ---\n{text}")
    return "\n\n".join(extracted_pages)

def process_record(record):
    body = json.loads(record["body"])
    task_id = body["task_id"]
    receive_count = int(record["attributes"].get("ApproximateReceiveCount", 1))

    # Fetch initial item to get document_type and fields (saved by ingestion.py)
    resp = table.get_item(Key={"task_id": task_id})
    if "Item" not in resp:
        print(f"Task {task_id} not found in DynamoDB")
        return
    item = resp["Item"]
    document_type = item.get("document_type", "INVOICE")
    storage_key = item.get("storage_key", f"raw/{task_id}/document.pdf")

    # 1. Transition to PROCESSING
    table.update_item(
        Key={"task_id": task_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "PROCESSING"}
    )

    s3 = get_s3_client()
    import tempfile
    download_path = os.path.join(tempfile.gettempdir(), f"{task_id}.pdf")
    
    success = False
    
    try:
        # 2. Download from Supabase
        s3.download_file(SUPABASE_BUCKET_NAME, storage_key, download_path)
        
        # 3. Extract text
        raw_text = extract_text_from_pdf(download_path)
        
        # 4. Check for cancellation before calling LLM
        check_resp = table.get_item(Key={"task_id": task_id})
        if check_resp.get("Item", {}).get("status") == "CANCELLED":
            print(f"Task {task_id} was cancelled, aborting.")
            success = True
            return

        api_key = get_gemini_key()
        if not api_key:
            raise ValueError("Missing Gemini API Key")
            
        client = genai.Client(api_key=api_key, http_options={'timeout': 160000})
        
        # Define the schema inline using Pydantic (or use the one requested)
        selected_fields = item.get("selected_fields", [])
        
        if selected_fields:
            # Dynamically build the required schema using the user's custom fields
            field_defs = {f: (Optional[str], None) for f in selected_fields}
            ExtractionSchema = create_model("DynamicExtractionSchema", **field_defs)
            fields_prompt = "the requested fields"
        else:
            class ExtractedData(BaseModel):
                summary: Optional[str] = None
                total_amount: Optional[float] = None
                date: Optional[str] = None
                vendor_name: Optional[str] = None
            ExtractionSchema = ExtractedData
            fields_prompt = "the summary, total amount, date, and vendor name"
            
        prompt = f"""
You are an expert document extraction engine.
Document Type: {document_type}
Document Text:
\"\"\"
{raw_text}
\"\"\"
Extract {fields_prompt} accurately. If a field is not found or not applicable, leave it null.
"""
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractionSchema,
                temperature=0.0,
            )
        )
        
        from decimal import Decimal
        extracted_data = json.loads(response.text, parse_float=Decimal)
        
        # 5. Transition to COMPLETED
        table.update_item(
            Key={"task_id": task_id},
            UpdateExpression="SET #s = :s, extracted_data = :d",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "COMPLETED", ":d": extracted_data}
        )
        success = True
        
    except Exception as e:
        print(f"Error processing task {task_id}: {e}")
        if receive_count >= 3:
            table.update_item(
                Key={"task_id": task_id},
                UpdateExpression="SET #s = :s, error_message = :e",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":s": "FAILED", ":e": str(e)}
            )
        else:
            raise e
            
    finally:
        # Retry-aware deletion
        if success or receive_count >= 3:
            try:
                s3.delete_object(Bucket=SUPABASE_BUCKET_NAME, Key=storage_key)
            except Exception as e:
                print(f"Failed to delete {storage_key} from Supabase: {e}")
        
        if os.path.exists(download_path):
            os.remove(download_path)

def lambda_handler(event, context):
    batch_item_failures = []
    
    for record in event.get("Records", []):
        try:
            process_record(record)
        except Exception:
            batch_item_failures.append({"itemIdentifier": record["messageId"]})
            
    return {"batchItemFailures": batch_item_failures}
