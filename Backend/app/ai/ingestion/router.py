from fastapi import APIRouter, UploadFile, Depends
from .service import ingest_document
from core.auth import admin_guard

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])

@router.post("/documents")
async def upload_document(
    file: UploadFile,
    doc_type: str,
    default_mode: str,
    difficulty: str,
    version: str,
    user=Depends(admin_guard)
):
    return await ingest_document(
        file=file,
        doc_type=doc_type,
        default_mode=default_mode,
        difficulty=difficulty,
        version=version,
        user_id=user["id"]
    )
