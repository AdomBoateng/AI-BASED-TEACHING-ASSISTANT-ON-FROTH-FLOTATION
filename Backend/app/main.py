from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.ingestion.router import router as ingestion_router
from app.ai.rag.router import router as rag_router
from app.api.v1.auth import router as auth_router
from app.api.v1.sessions.router import router as sessions_router
from app.api.v1.users.router import router as users_router
from app.api.v1.feedback import router as feedback_router
from app.ai.rag.modes_sessions.router import router as mode_sessions_router
from app.config import load_env

load_env()

app = FastAPI(
    title="Froth Flotation Tutor API",
    version="1.0.0",
)

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

app.include_router(ingestion_router)
app.include_router(rag_router)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(users_router)
app.include_router(feedback_router)
app.include_router(mode_sessions_router)