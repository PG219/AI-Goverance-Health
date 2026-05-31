import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def get_chat_model(temperature: float = 0.2):
    provider = os.getenv("GENAI_PROVIDER", "gemini").lower()
    
    if provider == "vertexai":
        try:
            from langchain_google_vertexai import ChatVertexAI
            project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
            return ChatVertexAI(
                model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash"),
                temperature=temperature,
                project=project_id or None,
            )
        except ImportError:
            raise RuntimeError(
                "langchain-google-vertexai package is not installed. "
                "Please run: pip install langchain-google-vertexai"
            )

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set in backend/Agents/.env")

    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_CHAT_MODEL", DEFAULT_GEMINI_MODEL),
        temperature=temperature,
        google_api_key=api_key,
    )


def invoke_text(messages: List[Dict[str, str]], temperature: float = 0.2) -> str:
    response = get_chat_model(temperature=temperature).invoke(messages)
    content: Any = response.content

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        chunks = []
        for part in content:
            if isinstance(part, dict) and "text" in part:
                chunks.append(str(part["text"]))
            else:
                chunks.append(str(part))
        return "".join(chunks).strip()

    return str(content).strip()
