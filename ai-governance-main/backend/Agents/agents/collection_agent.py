import io
import json
import os
from typing import Any, Dict, List, Optional, TypedDict

import pandas as pd
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from langgraph.graph import END, StateGraph
from pydantic import BaseModel
from pypdf import PdfReader

from .llm_provider import get_chat_model

load_dotenv()

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


class CollectionState(TypedDict):
    messages: List[Any]
    requirements: List[Dict[str, Any]]
    next_question: str
    finished: bool


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


def _extract_text_response(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if isinstance(part, dict) and "text" in part:
                parts.append(str(part["text"]))
            else:
                parts.append(str(part))
        return "".join(parts)
    return str(content)


def _clean_json_block(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:-3].strip()
    elif text.startswith("```"):
        text = text[3:-3].strip()

    start = text.find("[")
    if start == -1:
        start = text.find("{")
    end = text.rfind("]")
    if end == -1:
        end = text.rfind("}")

    if start != -1 and end != -1:
        text = text[start : end + 1]
    return text


def extract_requirements(state: CollectionState):
    llm = get_chat_model(temperature=0)
    history = "\n".join(f"{m['role']}: {m['content']}" for m in state["messages"])
    prompt = EXTRACTION_PROMPT.format(history=history)

    try:
        response = llm.invoke(prompt)
        text = _clean_json_block(_extract_text_response(response.content))
        return {"requirements": json.loads(text)}
    except Exception as exc:
        print(f"Error parsing requirements: {exc}")
        return {"requirements": []}


def generate_response(state: CollectionState):
    llm = get_chat_model(temperature=0.2)
    history = "\n".join(f"{m['role']}: {m['content']}" for m in state["messages"])
    prompt = CHAT_PROMPT.format(history=history)

    try:
        response = llm.invoke(prompt)
        return {"next_question": _extract_text_response(response.content).strip()}
    except Exception as exc:
        print(f"Error generating response: {exc}")
        return {"next_question": "Could you provide more details about your security requirements?"}


def build_graph():
    graph = StateGraph(CollectionState)
    graph.add_node("extract", extract_requirements)
    graph.add_node("respond", generate_response)
    graph.set_entry_point("extract")
    graph.add_edge("extract", "respond")
    graph.add_edge("respond", END)
    return graph.compile()


_graph = build_graph()


class CollectionIn(BaseModel):
    session_id: Optional[str] = None
    messages: List[Dict[str, str]]


class CollectionOut(BaseModel):
    session_id: str
    requirements: List[Dict[str, Any]]
    answer: str
    finished: bool


def extract_text_from_pdf(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:
        print(f"PDF Error: {exc}")
        return ""


def extract_text_from_excel(content: bytes) -> str:
    try:
        return pd.read_excel(io.BytesIO(content)).to_string()
    except Exception as exc:
        print(f"Excel Error: {exc}")
        return ""


@router.post("/collect", response_model=CollectionOut)
async def collect_requirements(payload: CollectionIn):
    sid = payload.session_id or "new-session"

    if not GOOGLE_API_KEY:
        print("[ERROR] GOOGLE_API_KEY is missing!")
        return CollectionOut(
            session_id=sid,
            requirements=[],
            answer="AI not configured. Add GOOGLE_API_KEY.",
            finished=False,
        )

    inputs: CollectionState = {
        "messages": payload.messages,
        "requirements": [],
        "next_question": "",
        "finished": False,
    }

    try:
        result = _graph.invoke(inputs)
        return CollectionOut(
            session_id=sid,
            requirements=result.get("requirements", []),
            answer=result.get("next_question", "I've analyzed the conversation."),
            finished=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form("upload-session"),
):
    try:
        content = await file.read()
        filename = file.filename.lower()

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

        llm = get_chat_model(temperature=0)
        history = f"DOCUMENT: {filename}\nCONTENT:\n{extracted_text[:10000]}"
        prompt = EXTRACTION_PROMPT.format(history=history)
        response = llm.invoke(prompt)
        text = _clean_json_block(_extract_text_response(response.content))
        parsed = json.loads(text)

        requirements: List[Dict[str, Any]]
        if isinstance(parsed, list):
            requirements = parsed
        elif isinstance(parsed, dict):
            requirements = parsed.get("requirements") or parsed.get("data") or parsed.get("items") or []
        else:
            requirements = []

        if not isinstance(requirements, list):
            requirements = []

        for item in requirements:
            if isinstance(item, dict):
                item["source"] = f"Document: {filename}"

        print(f"[SUCCESS] Extracted {len(requirements)} items from {filename}")
        return {
            "success": True,
            "requirements": requirements,
            "message": f"Successfully extracted {len(requirements)} requirements from {filename}.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Upload Error: {exc}")
        raise HTTPException(500, detail=str(exc))
