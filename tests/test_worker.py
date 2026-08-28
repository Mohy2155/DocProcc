import json
import pytest
from unittest.mock import patch, MagicMock
from src.handlers import worker

@pytest.fixture
def mock_gemini():
    with patch("src.handlers.worker.genai.Client") as mock_client:
        mock_instance = mock_client.return_value
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Mock summary",
            "total_amount": 100.0,
            "date": "2023-01-01",
            "vendor_name": "Mock Vendor"
        })
        mock_instance.models.generate_content.return_value = mock_response
        yield mock_instance

@pytest.fixture
def mock_pdf_reader():
    with patch("src.handlers.worker.PdfReader") as mock_reader:
        mock_instance = mock_reader.return_value
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Mock PDF content"
        mock_instance.pages = [mock_page]
        yield mock_instance

@pytest.fixture(autouse=True)
def mock_get_s3_client(s3_client):
    with patch("src.handlers.worker.get_s3_client", return_value=s3_client):
        yield s3_client

def test_worker_success(dynamodb_resource, s3_client, mock_gemini, mock_pdf_reader):
    task_id = "test-success-123"
    storage_key = f"raw/{task_id}/document.pdf"

    dynamodb_resource.put_item(
        Item={
            "task_id": task_id,
            "status": "PENDING",
            "document_type": "INVOICE",
            "storage_key": storage_key
        }
    )

    s3_client.put_object(
        Bucket="docprocc-uploads",
        Key=storage_key,
        Body=b"dummy pdf content"
    )

    event = {
        "Records": [{
            "messageId": "msg-1",
            "body": json.dumps({"task_id": task_id}),
            "attributes": {"ApproximateReceiveCount": "1"}
        }]
    }

    response = worker.lambda_handler(event, {})
    
    assert response["batchItemFailures"] == []

    item = dynamodb_resource.get_item(Key={"task_id": task_id})["Item"]
    assert item["status"] == "COMPLETED"
    assert item["extracted_data"]["summary"] == "Mock summary"
    
    objs = s3_client.list_objects_v2(Bucket="docprocc-uploads", Prefix=storage_key)
    assert "Contents" not in objs

def test_worker_transient_failure_retries(dynamodb_resource, s3_client, mock_gemini, mock_pdf_reader):
    task_id = "test-fail-1"
    storage_key = f"raw/{task_id}/document.pdf"

    dynamodb_resource.put_item(
        Item={
            "task_id": task_id,
            "status": "PENDING",
            "storage_key": storage_key
        }
    )

    s3_client.put_object(
        Bucket="docprocc-uploads",
        Key=storage_key,
        Body=b"dummy pdf content"
    )

    mock_gemini.models.generate_content.side_effect = Exception("Transient timeout")

    event = {
        "Records": [{
            "messageId": "msg-2",
            "body": json.dumps({"task_id": task_id}),
            "attributes": {"ApproximateReceiveCount": "1"}
        }]
    }

    response = worker.lambda_handler(event, {})
    
    assert len(response["batchItemFailures"]) == 1
    assert response["batchItemFailures"][0]["itemIdentifier"] == "msg-2"

    item = dynamodb_resource.get_item(Key={"task_id": task_id})["Item"]
    assert item["status"] == "PROCESSING"
    
    objs = s3_client.list_objects_v2(Bucket="docprocc-uploads", Prefix=storage_key)
    assert len(objs["Contents"]) == 1

def test_worker_permanent_failure_deletes(dynamodb_resource, s3_client, mock_gemini, mock_pdf_reader):
    task_id = "test-fail-3"
    storage_key = f"raw/{task_id}/document.pdf"

    dynamodb_resource.put_item(
        Item={
            "task_id": task_id,
            "status": "PENDING",
            "storage_key": storage_key
        }
    )

    s3_client.put_object(
        Bucket="docprocc-uploads",
        Key=storage_key,
        Body=b"dummy pdf content"
    )

    mock_gemini.models.generate_content.side_effect = Exception("Permanent failure")

    event = {
        "Records": [{
            "messageId": "msg-3",
            "body": json.dumps({"task_id": task_id}),
            "attributes": {"ApproximateReceiveCount": "3"}
        }]
    }

    response = worker.lambda_handler(event, {})
    
    assert response["batchItemFailures"] == []

    item = dynamodb_resource.get_item(Key={"task_id": task_id})["Item"]
    assert item["status"] == "FAILED"
    
    objs = s3_client.list_objects_v2(Bucket="docprocc-uploads", Prefix=storage_key)
    assert "Contents" not in objs
