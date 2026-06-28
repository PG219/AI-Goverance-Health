import os
from dotenv import load_dotenv
load_dotenv()

from agents.llm_provider import get_chat_model

try:
    print("Initializing LLM...")
    llm = get_chat_model(temperature=0)
    print(f"Provider: {os.getenv('GENAI_PROVIDER', 'gemini')}")
    print(f"API Key: {os.getenv('GOOGLE_API_KEY')[:10]}...")
    print("Invoking test call...")
    response = llm.invoke("Hello, say 'API works' in one word.")
    print(f"✅ Success! Response: {response.content}")
except Exception as e:
    print(f" Error occurred during LLM call: {e}")
    import traceback
    traceback.print_exc()
