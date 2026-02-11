from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.ingestion.router import router as ingestion_router
from app.ai.rag.router import router as rag_router
from app.api.v1.auth import router as auth_router


app = FastAPI(
    title="Froth Flotation Tutor API",
    version="1.0.0",
)

# CORS (ok for testing; lock down in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

# mount routers
app.include_router(ingestion_router)  # /ingestion/...
app.include_router(rag_router)        # /rag/...
app.include_router(auth_router)       # /auth/...