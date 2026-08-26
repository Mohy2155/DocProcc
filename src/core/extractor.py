import json
import os
from google import genai
from google.genai import types
from pypdf import PdfReader


def extract_text_from_pdf(pdf_path: str) -> str:
  """Reads a PDF file from disk and extracts raw text across all pages."""
  if not os.path.exists(pdf_path):
    raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

  reader = PdfReader(pdf_path)
  extracted_pages = []

  for index, page in enumerate(reader.pages):
    text = page.extract_text()
    if text:
      extracted_pages.append(f"--- Page {index + 1} ---\n{text}") ## Make it easier for the LLM to parse by providing spacial context

  return "\n\n".join(extracted_pages)


def structure_document_data(
    raw_text: str, document_type: str, selected_fields: list[str], api_key: str
) -> dict:
  """Sends raw document text to Gemini and forces it to return a valid JSON object matching the requested schema."""
  if not api_key:
    raise ValueError("A valid Gemini API key must be provided.")

  # Initialize the Google GenAI client
  client = genai.Client(api_key=api_key)

  prompt = f"""
You are an expert document extraction engine.
Document Type: {document_type}
Target Fields to Extract: {', '.join(selected_fields)}

Document Text:
\"\"\"
{raw_text}
\"\"\"

Extract the target fields accurately. If a field cannot be found in the text, set its value to null.
"""

  # Request structured JSON output using Gemini Flash
  response = client.models.generate_content(
      model="gemini-3.6-flash",
      contents=prompt,
      config=types.GenerateContentConfig(
          response_mime_type="application/json",
          temperature=0.0,
      ),
  )

  # Parse the model response string into a native Python dictionary
  return json.loads(response.text)