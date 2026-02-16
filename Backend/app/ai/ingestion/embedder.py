import os
from openai import OpenAI

from app.config import load_env

load_env()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("Missing OPENAI_API_KEY environment variable.")
client = OpenAI(api_key=api_key)

def embed_chunks(texts):
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=texts
    )
    return [d.embedding for d in response.data]
