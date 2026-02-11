import os
import uuid
import json
from pinecone import Pinecone
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("PINECONE_API_KEY", "pcsk_2ZaVgj_BBNx1fYWU75GjxEhhsqconMbyif8yUbsW9gozpd6tnj9sSqk8f78nHFA1JERKQC")
index_name = os.getenv("PINECONE_INDEX", "froth-flotation")

if not api_key:
    raise RuntimeError("PINECONE_API_KEY is not set")

if not index_name:
    raise RuntimeError("PINECONE_INDEX is not set")

pc = Pinecone(api_key=api_key)
available_indexes = pc.list_indexes().names()

if index_name not in available_indexes:
    raise RuntimeError(
        f"Pinecone index '{index_name}' not found. "
        "Create it in Pinecone or update PINECONE_INDEX_NAME."
    )

index = pc.Index(index_name)

def _normalize_embedding(embedding):
    if isinstance(embedding, str):
        embedding = json.loads(embedding)
    return [float(value) for value in embedding]


def upsert_vectors(embeddings, chunks, namespace):
    ids = []

    vectors = []
    for emb, chunk in zip(embeddings, chunks):
        pid = str(uuid.uuid4())
        ids.append(pid)
        emb = _normalize_embedding(emb)
        vectors.append((pid, emb, {
            "mode": chunk["mode"],
            "topic": chunk.get("topic"),
            "text": chunk.get("text", "")
        }))

    index.upsert(vectors=vectors, namespace=namespace)
    return ids
