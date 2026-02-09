from db.supabase import supabase
from .parser import parse_document
from .chunker import chunk_text
from .embedder import embed_chunks
from .pinecone import upsert_vectors
from .normalizer import normalize_sections
import hashlib

async def ingest_document(
    file,
    doc_type,
    default_mode,
    difficulty,
    version,
    user_id
):
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