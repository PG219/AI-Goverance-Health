import os
import json
import io
import pandas as pd
from typing import List, Optional, Dict, Any, TypedDict
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from pypdf import PdfReader
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

# Vertex AI imports
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

load_dotenv()

router = APIRouter()

# ---- Config ----
PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "bionic-mercury-455722-g1")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("MODEL", "gemini-2.5-flash-lite")
vertexai.init(project=PROJECT, location=LOCATION)

# ---- DB Mock / Cache ----
sessions = {}

# ---- LangGraph State ----
class CollectionState(TypedDict):
    messages: List[Any]
    requirements: List[Dict[str, Any]]
    next_question: str
    finished: bool

# ---- Prompts ----
EXTRACTION_PROMPT = """
You are a Cyber Security Requirement Extractor.
Analyze the following conversation and extract all security requirements.
For each requirement, provide:
- title: A short descriptive name
- description: A detailed explanation of the requirement
- category: One of [Authentication, Access Control, Encryption, Data Protection, Logging, Network Security, Physical Security, Incident Response, Compliance, AI Security, IoT Security, Other]
- priority: One of [Critical, High, Medium, Low]

Return the response ONLY as a JSON list of objects.

Conversation:
{history}
"""

CHAT_PROMPT = """
You are a Security Consultant helping a user gather requirements for their project.
Your goal is to be helpful and professional.
Ask one follow-up question at a time to uncover more security needs if necessary.
If you have enough information, summarize what you've found.

Conversation:
{history}
"""

# ---- Helper: Call Vertex AI ----
def call_vertex(prompt: str, temperature: float = 0, max_tokens: int = 1000) -> str:
    model = GenerativeModel(MODEL)
    response = model.generate_content(
        prompt,
        generation_config=GenerationConfig(temperature=temperature, max_output_tokens=max_tokens)
    )
    return response.text.strip()

# ---- Nodes ----
def extract_requirements(state: CollectionState):
    history = "\n".join([f"{m['role']}: {m['content']}" for m in state['messages']])
    prompt = EXTRACTION_PROMPT.format(history=history)

    try:
        text = call_vertex(prompt, temperature=0)
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        reqs = json.loads(text)
        return {"requirements": reqs}
    except Exception as e:
        print(f"Error parsing requirements: {e}")
        return {"requirements": []}

def generate_response(state: CollectionState):
    history = "\n".join([f"{m['role']}: {m['content']}" for m in state['messages']])
    prompt = CHAT_PROMPT.format(history=history)

    try:
        text = call_vertex(prompt, temperature=0.2)
        return {"next_question": text}
    except Exception as e:
        print(f"Error generating response: {e}")
        return {"next_question": "Could you provide more details about your security requirements?"}

# ---- Graph Setup ----
def build_graph():
    graph = StateGraph(CollectionState)
    graph.add_node("extract", extract_requirements)
    graph.add_node("respond", generate_response)
    graph.set_entry_point("extract")
    graph.add_edge("extract", "respond")
    graph.add_edge("respond", END)
    return graph.compile()

_graph = build_graph()

# ---- API Schemas ----
class CollectionIn(BaseModel):
    session_id: Optional[str] = None
    messages: List[Dict[str, str]]

class CollectionOut(BaseModel):
    session_id: str
    requirements: List[Dict[str, Any]]
    answer: str
    finished: bool

# ---- Document Parsing Helpers ----
def extract_text_from_pdf(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"PDF Error: {e}")
        return ""

def extract_text_from_excel(content: bytes) -> str:
    try:
        df = pd.read_excel(io.BytesIO(content))
        return df.to_string()
    except Exception as e:
        print(f"Excel Error: {e}")
        return ""

# ---- Endpoints ----
@router.post("/collect", response_model=CollectionOut)
async def collect_requirements(payload: CollectionIn):
    sid = payload.session_id or "new-session"

    inputs = {
        "messages": payload.messages,
        "requirements": [],
        "next_question": "",
        "finished": False
    }

    try:
        result = _graph.invoke(inputs)
        return CollectionOut(
            session_id=sid,
            requirements=result.get("requirements", []),
            answer=result.get("next_question", "I've analyzed the conversation."),
            finished=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form("upload-session")
):
    try:
        content = await file.read()
        filename = file.filename.lower()
        extracted_text = ""

        if filename.endswith(".pdf"):
            extracted_text = extract_text_from_pdf(content)
        elif filename.endswith((".xlsx", ".xls")):
            extracted_text = extract_text_from_excel(content)
        elif filename.endswith((".txt", ".md")):
            extracted_text = content.decode("utf-8")
        else:
            raise HTTPException(400, "Unsupported file type. Please upload PDF, Excel, or Text files.")

        if not extracted_text.strip():
            raise HTTPException(400, "Could not extract any text from the document.")

        history = f"DOCUMENT: {filename}\nCONTENT:\n{extracted_text[:10000]}"
        prompt = EXTRACTION_PROMPT.format(history=history)

        try:
            text = call_vertex(prompt, temperature=0)
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()

            start = text.find("[")
            if start == -1: start = text.find("{")
            end = text.rfind("]")
            if end == -1: end = text.rfind("}")

            if start != -1 and end != -1:
                text = text[start:end+1]

            parsed = json.loads(text)

            reqs = []
            if isinstance(parsed, list):
                reqs = parsed
            elif isinstance(parsed, dict):
                reqs = parsed.get("requirements") or parsed.get("data") or parsed.get("items") or []

            if not isinstance(reqs, list):
                reqs = []

            for r in reqs:
                if isinstance(r, dict):
                    r["source"] = f"Document: {filename}"

            print(f"[SUCCESS] Extracted {len(reqs)} items from {filename}")

            return {
                "success": True,
                "requirements": reqs,
                "message": f"Successfully extracted {len(reqs)} requirements from {filename}."
            }
        except Exception as e:
            print(f"JSON Parse Error from Doc: {e}\nText was: {text[:500]}")
            return {"success": False, "error": f"AI response format error: {str(e)}"}

    except Exception as e:
        print(f"Upload Error: {str(e)}")
        raise HTTPException(500, detail=str(e))