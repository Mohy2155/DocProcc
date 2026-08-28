import os
import pytest
import boto3
from moto import mock_aws

# Set environment variables for tests globally to prevent module-level boto3 failures during pytest collection
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_SECURITY_TOKEN"] = "testing"
os.environ["AWS_SESSION_TOKEN"] = "testing"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["SUPABASE_PROJECT_ID"] = "test-project"
os.environ["SUPABASE_ACCESS_KEY_ID"] = "test-key"
os.environ["SUPABASE_SECRET_ACCESS_KEY"] = "test-secret"
os.environ["SUPABASE_BUCKET_NAME"] = "docprocc-uploads"
os.environ["DYNAMODB_TABLE"] = "DocProccJobs"
os.environ["GEMINI_API_KEY"] = "test-gemini-key"

@pytest.fixture(scope="function")
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    pass

@pytest.fixture(scope="function")
def moto_boto(aws_credentials):
    with mock_aws():
        yield

@pytest.fixture(scope="function")
def s3_client(moto_boto):
    client = boto3.client("s3")
    client.create_bucket(Bucket="docprocc-uploads")
    yield client

@pytest.fixture(scope="function")
def dynamodb_client(moto_boto):
    dynamodb = boto3.client("dynamodb")
    dynamodb.create_table(
        TableName="DocProccJobs",
        KeySchema=[{"AttributeName": "task_id", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "task_id", "AttributeType": "S"}],
        ProvisionedThroughput={"ReadCapacityUnits": 25, "WriteCapacityUnits": 25},
    )
    yield dynamodb

@pytest.fixture(scope="function")
def dynamodb_resource(moto_boto, dynamodb_client):
    resource = boto3.resource("dynamodb")
    yield resource.Table("DocProccJobs")

@pytest.fixture(scope="function")
def sqs_client(moto_boto):
    sqs = boto3.client("sqs")
    queue = sqs.create_queue(QueueName="DocProccJobQueue")
    os.environ["SQS_QUEUE_URL"] = queue["QueueUrl"]
    yield sqs
