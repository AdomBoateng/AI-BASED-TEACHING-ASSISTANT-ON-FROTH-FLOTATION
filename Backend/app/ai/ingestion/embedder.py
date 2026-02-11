import os
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "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"))

def embed_chunks(texts):
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=texts
    )
    return [d.embedding for d in response.data]
