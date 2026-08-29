import json
import os
import boto3

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "DocProccJobs")
table = dynamodb.Table(TABLE_NAME)

def build_response(status_code: int, body: dict) -> dict:
    from decimal import Decimal
    class DecimalEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, Decimal):
                return float(obj) if '.' in str(obj) else int(obj)
            return super(DecimalEncoder, self).default(obj)
            
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }

def lambda_handler(event: dict, context) -> dict:
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
