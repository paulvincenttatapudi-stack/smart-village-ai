from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status

from app.models.user import User
from app.services.auth_service import AuthService
from app.services.storage_service import save_upload_file

router = APIRouter(prefix="/api/upload", tags=["uploads"])


@router.post("/image", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(AuthService.get_current_user),
):
    url = await save_upload_file(file, "images")
    return {"url": url}


@router.post("/voice", response_model=dict)
async def upload_voice(
    file: UploadFile = File(...),
    current_user: User = Depends(AuthService.get_current_user),
):
    url = await save_upload_file(file, "voices")
    return {"url": url}


@router.post("/document", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(AuthService.get_current_user),
):
    url = await save_upload_file(file, "documents")
    return {"url": url}
