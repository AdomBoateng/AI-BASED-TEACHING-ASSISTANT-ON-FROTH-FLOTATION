import hashlib
import json
from openai import OpenAI
from pinecone import Pinecone
from app.db.supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY","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"))
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY","pcsk_2ZaVgj_BBNx1fYWU75GjxEhhsqconMbyif8yUbsW9gozpd6tnj9sSqk8f78nHFA1JERKQC"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME","froth-flotation"))

supabase = create_client(
    os.getenv("SUPABASE_URL", "https://fdqilmfldmzqynpvyiql.supabase.co"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcWlsbWZsZG16cXlucHZ5aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDAwMzI1MywiZXhwIjoyMDg1NTc5MjUzfQ.fzfAQrDACv1J4cItbI2F5Em-D-bAfq_gF-y75jLxmBg")
)


def hash_text(text: str):
    return hashlib.sha256(text.encode()).hexdigest()


def get_cached_embedding(text: str):
    text_hash = hash_text(text)

    result = supabase.table("embedding_cache") \
        .select("embedding") \
        .eq("text_hash", text_hash) \
        .execute()

    if result.data:
        return result.data[0]["embedding"]

    return None


def store_embedding(text: str, embedding):
    text_hash = hash_text(text)

    supabase.table("embedding_cache").insert({
        "text_hash": text_hash,
        "embedding": embedding
    }).execute()


def _normalize_embedding(embedding):
    """Ensure embedding is a list of floats."""
    if isinstance(embedding, str):
        embedding = json.loads(embedding)
    return [float(val) for val in embedding]


def retrieve_context(query: str, mode: str, top_k: int = 5):

    # 1️⃣ Try cache
    embedding = get_cached_embedding(query)

    # 2️⃣ If not cached → generate and store
    if embedding is None:
        embedding = openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=query
        ).data[0].embedding

        store_embedding(query, embedding)

    # 3️⃣ Normalize embedding to list of floats
    embedding = _normalize_embedding(embedding)

    # 4️⃣ Query Pinecone
    results = index.query(
        vector=embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=f"froth-{mode}",
        filter={"mode": {"$eq": mode}}
    )

    context_chunks = []
    for match in results["matches"]:
        metadata = match.get("metadata") or {}
        text = metadata.get("text") or metadata.get("content")
        if text:
            context_chunks.append(text)

    return context_chunks
