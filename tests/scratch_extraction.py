import json
import os
import sys
from dotenv import load_dotenv

# 1. Add the project root directory to Python's module lookup path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from src.core.extractor import structure_document_data

# 2. Load API key from local .env
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
  raise ValueError("GEMINI_API_KEY is not set in your .env file.")

# 3. Define sample document text simulating an extracted PDF invoice
sample_invoice_text = """
TAX INVOICE
Invoice Number: INV-2026-0881
Date: August 15, 2026
Vendor: Acme Heavy Equipment & Supplies LLC
Billed To: Zaeem Contracting
Subtotal: $4,500.00
VAT (5%): $225.00
Total Amount Due: $4,725.00
Payment Terms: Net 30 Days
"""

# 4. Configure target extraction parameters
doc_type = "INVOICE"
target_fields = [
    "invoice_number",
    "date",
    "vendor",
    "billed_to",
    "subtotal",
    "vat_amount",
    "total_amount_due",
]

print(f"Document Type: {doc_type}")
print(f"Target Fields: {target_fields}\n")
print("Sending request to Gemini API...")

# 5. Execute the extraction function
result = structure_document_data(
    raw_text=sample_invoice_text,
    document_type=doc_type,
    selected_fields=target_fields,
    api_key=api_key,
)

print("\n--- Extracted Structured JSON ---")
print(json.dumps(result, indent=2))