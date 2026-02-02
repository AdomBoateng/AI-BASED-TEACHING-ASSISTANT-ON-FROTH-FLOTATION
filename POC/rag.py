from pathlib import Path
import faiss
import numpy as np
import pickle
import requests

BASE_DIR = Path(__file__).parent
KNOWLEDGE_PATH = BASE_DIR / "knowledge"
INDEX_PATH = BASE_DIR / "index" / "faiss_index"
META_PATH = BASE_DIR / "meta" / "metadata.pkl"

OLLAMA_API_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text:latest"

class RAGEngine:
    def __init__(self):
        self.index: None
        self.chunks: []
        
    def chunk_text(self, text, chunk_size=400, overlap=50):
        words = text.split()
        chunks = []
        
        start  = 0 
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            start += chunk_size - overlap
        return chunks
    
    def embed_texts(self, texts):
        embeddings = []
        
        for text in texts:
            response = requests.post(
                OLLAMA_API_URL,
                json={
                    "model": EMBED_MODEL,
                    "prompt": text,
                },
                timeout=60
            )
            response.raise_for_status()
            embeddings.append(response.json()["embedding"])
        return np.array(embeddings, dtype='float32')
    
    def build_index(self):
        texts = []
        
        for md_file in KNOWLEDGE_PATH.glob("*.md"):
            content = md_file.read_text(encoding="utf-8")
            texts.extend(self.chunk_text(content))
            
        embeddings = self.embed_texts(texts)
        
        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings)
        
        self.chunks = texts
        
        faiss.write_index(self.index, str(INDEX_PATH))
        with open(META_PATH, "wb") as f:
            pickle.dump(self.chunks, f)
        
    
    def load_index(self):
        self.index = faiss.read_index(str(INDEX_PATH))
        with open(META_PATH, "rb") as f:
            self.chunks = pickle.load(f)
    
    def retrieve(self, query, top_k=3):
        query_embedding = self.embed_texts([query])
        distances, indices = self.index.search(query_embedding, top_k)
        retrieved_chunks = [self.chunks[i] for i in indices[0]]
        return retrieved_chunks