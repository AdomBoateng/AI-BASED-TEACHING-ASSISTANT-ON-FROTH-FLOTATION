import hashlib
import json
import os
from typing import List

from openai import OpenAI
from pinecone import Pinecone

from app.config import load_env
from app.db.supabase import get_supabase

# Lazy singletons
_openai_client: OpenAI | None = None
_pinecone_index = None

def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        load_env()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing OPENAI_API_KEY environment variable.")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client

def _get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is None:
        load_env()
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX") or os.getenv("PINECONE_INDEX_NAME")
        if not api_key or not index_name:
            raise RuntimeError(
                "Missing PINECONE_API_KEY or PINECONE_INDEX/PINECONE_INDEX_NAME environment variables."
            )
        pc = Pinecone(api_key=api_key)
        _pinecone_index = pc.Index(index_name)
    return _pinecone_index

def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def _normalize_embedding(embedding):
    """Ensure embedding is a list[float]."""
    if isinstance(embedding, str):
        embedding = json.loads(embedding)
    return [float(v) for v in embedding]

def _get_cached_embedding(text: str):
    supabase = get_supabase()
    text_hash = _hash_text(text)
    res = supabase.table("embedding_cache").select("embedding").eq("text_hash", text_hash).execute()
    if res.data:
        return res.data[0]["embedding"]
    return None

def _store_embedding(text: str, embedding):
    supabase = get_supabase()
    text_hash = _hash_text(text)
    supabase.table("embedding_cache").insert({"text_hash": text_hash, "embedding": embedding}).execute()

def retrieve_context(query: str, mode: str, top_k: int = 5) -> List[str]:
    """
    Retrieves top_k chunks from Pinecone, using OpenAI embeddings.
    Uses Supabase embedding_cache to avoid re-embedding repeated queries.
    """
    mode = (mode or "learn").lower().strip()

    embedding = _get_cached_embedding(query)
    if embedding is None:
        embedding = _get_openai().embeddings.create(
            model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
            input=query
        ).data[0].embedding
        _store_embedding(query, embedding)

    embedding = _normalize_embedding(embedding)

    index = _get_pinecone_index()
    results = index.query(
        vector=embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=f"froth-{mode}",
        filter={"mode": {"$eq": mode}},
    )

    chunks: List[str] = []
    for match in results.get("matches", []):
        metadata = match.get("metadata") or {}
        text = metadata.get("text") or metadata.get("content")
        if text:
            chunks.append(text)

    return chunks