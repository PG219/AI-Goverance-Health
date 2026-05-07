import os
import json
from typing import List, Optional, Dict, Any, TypedDict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv
from .llm_provider import get_chat_model

load_dotenv()

router = APIRouter()

# ---- Config ----
MODEL_NAME = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# ---- DB Mock / Cache ----
# In a real app, this would be in MongoDB
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
You are a Security Consultant helping a user gather security requirements for an AI governance inventory.

Work as a guided intake assistant:
- Ask one relevant follow-up question at a time when the user's input is incomplete.
- If you can infer useful requirements, briefly summarize them and ask the user to confirm before they are added to inventory.
- Do not claim you have saved anything. The application will save only after the user confirms.
- After confirmation, move to the next useful topic such as authentication, data protection, logging, model governance, incident response, or compliance mapping.

Conversation:
{history}
"""

# ---- Nodes ----
def extract_requirements(state: CollectionState):
    llm = get_chat_model(temperature=0)
    history = "\n".join([f"{m['role']}: {m['content']}" for m in state['messages']])
    
    prompt = EXTRACTION_PROMPT.format(history=history)
    res = llm.invoke(prompt)
    
    try:
        # Clean potential markdown formatting
        text = res.content.strip()
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
    llm = get_chat_model(temperature=0.2)
    history = "\n".join([f"{m['role']}: {m['content']}" for m in state['messages']])
    
    prompt = CHAT_PROMPT.format(history=history)
    res = llm.invoke(prompt)
    
    return {"next_question": res.content}

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

import io
import pandas as pd
from pypdf import PdfReader
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

# ... existing code ...

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
    
    if not GOOGLE_API_KEY:
        print("[ERROR] GOOGLE_API_KEY is missing!")
        return CollectionOut(
            session_id=sid,
            requirements=[],
            answer="AI not configured. Add GOOGLE_API_KEY.",
            finished=False
        )

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

        # Build a pseudo-message for extraction
        dummy_messages = [
            {"role": "user", "content": f"Analyze this document: {filename}"},
            {"role": "system", "content": f"Document Content:\n{extracted_text[:15000]}"} # Limit to avoid token issues
        ]

        # Use the existing extraction node logic
        llm = get_chat_model(temperature=0)
        history = f"DOCUMENT: {filename}\nCONTENT:\n{extracted_text[:10000]}" # Truncated for prompt safety
        
        prompt = EXTRACTION_PROMPT.format(history=history)
        res = llm.invoke(prompt)
        
        try:
            # Handle list or string content from Gemini
            raw_text = ""
            if isinstance(res.content, str):
                raw_text = res.content
            elif isinstance(res.content, list):
                for part in res.content:
                    if isinstance(part, dict) and "text" in part: raw_text += part["text"]
                    else: raw_text += str(part)
            
            text = raw_text.strip()
            if text.startswith("```json"): text = text[7:-3].strip()
            elif text.startswith("```"): text = text[3:-3].strip()
            
            # Remove any potential trailing/leading non-json chars
            start = text.find("[")
            if start == -1: start = text.find("{")
            end = text.rfind("]")
            if end == -1: end = text.rfind("}")
            
            if start != -1 and end != -1:
                text = text[start:end+1]

            parsed = json.loads(text)
            
            # Gemini sometimes returns {"requirements": [...]} or just [...]
            reqs = []
            if isinstance(parsed, list):
                reqs = parsed
            elif isinstance(parsed, dict):
                reqs = parsed.get("requirements") or parsed.get("data") or parsed.get("items") or []
            
            if not isinstance(reqs, list):
                reqs = []

            # Label the source
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
