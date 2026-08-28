import json
from src.handlers import retrieval

def test_retrieval_success(dynamodb_resource):
    # Setup initial data
    dynamodb_resource.put_item(
        Item={
            "task_id": "test-123",
            "status": "COMPLETED",
            "extracted_data": {"summary": "Test Summary"}
        }
    )

    event = {
        "queryStringParameters": {"task_id": "test-123"}
    }
    
    response = retrieval.lambda_handler(event, {})
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["task_id"] == "test-123"
    assert body["status"] == "COMPLETED"
    assert body["extracted_data"]["summary"] == "Test Summary"

def test_retrieval_path_based_success(dynamodb_resource):
    # Setup initial data
    dynamodb_resource.put_item(
        Item={
            "task_id": "test-path-123",
            "status": "COMPLETED",
            "extracted_data": {"summary": "Path Summary"}
        }
    )

    event = {
        "rawPath": "/status/test-path-123"
    }
    
    response = retrieval.lambda_handler(event, {})
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["task_id"] == "test-path-123"
    assert body["extracted_data"]["summary"] == "Path Summary"

def test_retrieval_not_found(dynamodb_resource):
    event = {
        "queryStringParameters": {"task_id": "unknown-task"}
    }
    
    response = retrieval.lambda_handler(event, {})
    
    assert response["statusCode"] == 404
    body = json.loads(response["body"])
    assert "error" in body

def test_retrieval_missing_task_id(dynamodb_resource):
    event = {}
    
    response = retrieval.lambda_handler(event, {})
    
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "error" in body
