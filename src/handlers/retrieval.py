import json
import os
import boto3

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "DocProccJobs")
table = dynamodb.Table(TABLE_NAME)

def build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
        "body": json.dumps(body),
    }

def lambda_handler(event: dict, context) -> dict:
    # Handle CORS preflight
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method", "GET")
    )
    if http_method == "OPTIONS":
        return build_response(200, {"message": "OK"})

    query_params = event.get("queryStringParameters", {}) or {}
    task_id = query_params.get("task_id")

    # Fallback to path-based routing, e.g. /status/{task_id}
    if not task_id:
        raw_path = event.get("rawPath", "")
        if "/status/" in raw_path:
            task_id = raw_path.split("/status/")[-1].strip("/")

    if not task_id:
        return build_response(400, {"error": "Missing task_id in query parameters"})

    try:
        response = table.get_item(Key={"task_id": task_id})
        item = response.get("Item")

        if not item:
            return build_response(404, {"error": "Task not found"})

        return build_response(200, item)
        
    except Exception as e:
        print(f"Error retrieving task {task_id}: {e}")
        return build_response(500, {"error": "Internal server error"})
