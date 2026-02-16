from app.db.supabase import get_supabase
from .parser import parse_document
from .chunker import chunk_text
from .embedder import embed_chunks
from .pinecone import upsert_vectors
from .normalizer import normalize_sections
import hashlib


def _resolve_default_mode(default_mode: str | None, doc_type: str) -> str:
    mode_map = {
        "knowledge": "learn",
        "assessment": "review",
        "practice": "practice"
    }
    allowed = {"learn", "review", "practice"}

    if not default_mode or default_mode == "default":
        resolved = mode_map.get(doc_type)
        if not resolved:
            raise ValueError(f"Unsupported doc_type: {doc_type}")
        return resolved

    if default_mode not in allowed:
        raise ValueError(f"Unsupported default_mode: {default_mode}")

    return default_mode


def _resolve_difficulty(difficulty: str | None) -> str:
    allowed = {"beginner", "intermediate", "advanced"}
    synonyms = {
        "easy": "beginner",
        "medium": "intermediate",
        "normal": "intermediate",
        "hard": "advanced"
    }

    if not difficulty:
        return "beginner"

    normalized = difficulty.strip().lower()
    normalized = synonyms.get(normalized, normalized)

    if normalized not in allowed:
        raise ValueError(f"Unsupported difficulty: {difficulty}")

    return normalized


def _resolve_doc_type(doc_type: str | None) -> str:
    allowed = {"knowledge", "assessment", "practice"}
    synonyms = {
        "learn": "knowledge",
        "review": "assessment"
    }

    if not doc_type:
        raise ValueError("doc_type is required")

    normalized = doc_type.strip().lower()
    normalized = synonyms.get(normalized, normalized)

    if normalized not in allowed:
        raise ValueError(f"Unsupported doc_type: {doc_type}")

    return normalized

async def ingest_document(
    file,
    doc_type,
    default_mode,
    difficulty,
    version,
    user_id
):
    doc_type = _resolve_doc_type(doc_type)
    default_mode = _resolve_default_mode(default_mode, doc_type)
    difficulty = _resolve_difficulty(difficulty)

    supabase = get_supabase()

    # 1. Register document
    doc = supabase.table("documents").insert({
        "title": file.filename,
        "source_filename": file.filename,
        "doc_type": doc_type,
        "default_mode": default_mode,
        "difficulty": difficulty,
        "version": version,
        "created_by": user_id
    }).execute().data[0]

    document_id = doc["id"]

    try:
        # 2. Parse
        sections = parse_document(file)
        
        # 3. Normalize
        normalised_sections = normalize_sections(sections)

        # 4. Chunk
        chunks = chunk_text(normalised_sections, doc_type)

        # 5. Embed
        embeddings = embed_chunks([c["text"] for c in chunks])

        # 6. Upsert to Pinecone
        pinecone_ids = upsert_vectors(
            embeddings,
            chunks,
            namespace=f"froth-{default_mode}"
        )

        # 7. Store chunk metadata
        for chunk, pid in zip(chunks, pinecone_ids):
            supabase.table("document_chunks").insert({
                "document_id": document_id,
                "pinecone_id": pid,
                "pinecone_namespace": f"froth-{default_mode}",
                "mode": chunk["mode"],
                "topic": chunk.get("topic"),
                "difficulty": difficulty,
                "content_hash": hashlib.sha256(
                    chunk["text"].encode()
                ).hexdigest()
            }).execute()

        # 8. Finalize
        supabase.table("documents").update({
            "status": "ready",
            "total_chunks": len(chunks)
        }).eq("id", document_id).execute()

        return {
            "document_id": document_id,
            "chunks": len(chunks),
            "status": "ready"
        }

    except Exception as e:
        supabase.table("documents").update({
            "status": "failed"
        }).eq("id", document_id).execute()
        raise e