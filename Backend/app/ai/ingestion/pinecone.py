import pinecone
import uuid

pinecone.init(api_key=..., environment=...)
index = pinecone.Index("froth-flotation")

def upsert_vectors(embeddings, chunks, namespace):
    ids = []

    vectors = []
    for emb, chunk in zip(embeddings, chunks):
        pid = str(uuid.uuid4())
        ids.append(pid)
        vectors.append((pid, emb, {
            "mode": chunk["mode"],
            "topic": chunk.get("topic")
        }))

    index.upsert(vectors=vectors, namespace=namespace)
    return ids
