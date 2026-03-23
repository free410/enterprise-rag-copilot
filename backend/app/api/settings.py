from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest
from app.services.settings_service import settings_service


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(db: DbSession, _: CurrentUser) -> SettingsResponse:
    return settings_service.get_settings(db)


@router.post("", response_model=SettingsResponse)
def save_settings(
    payload: SettingsUpdateRequest,
    db: DbSession,
    _: CurrentUser,
) -> SettingsResponse:
    return settings_service.save_settings(db, payload)
