from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.system_setting import SystemSetting
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest


class SettingsService:
    def __init__(self) -> None:
        self.defaults = {
            "default_provider": "mock",
            "default_top_k": str(settings.default_top_k),
            "data_dir": str(settings.data_dir),
            "index_dir": str(settings.vector_store_dir),
        }

    def get_settings(self, db: Session) -> SettingsResponse:
        stored = {
            item.setting_key: item
            for item in db.scalars(select(SystemSetting)).all()
        }

        updated_at = None
        payload: dict[str, str] = {}
        for key, default_value in self.defaults.items():
            record = stored.get(key)
            if record is None:
                payload[key] = default_value
            else:
                payload[key] = record.setting_value
                updated_at = max(updated_at, record.updated_at) if updated_at else record.updated_at

        return SettingsResponse(
            default_provider=payload["default_provider"],
            default_top_k=int(payload["default_top_k"]),
            data_dir=payload["data_dir"],
            index_dir=payload["index_dir"],
            updated_at=updated_at,
        )

    def save_settings(self, db: Session, payload: SettingsUpdateRequest) -> SettingsResponse:
        values = {
            "default_provider": payload.default_provider,
            "default_top_k": str(payload.default_top_k),
            "data_dir": payload.data_dir,
            "index_dir": payload.index_dir,
        }

        existing = {
            item.setting_key: item
            for item in db.scalars(select(SystemSetting)).all()
        }

        for key, value in values.items():
            record = existing.get(key)
            if record is None:
                db.add(SystemSetting(setting_key=key, setting_value=value))
            else:
                record.setting_value = value

        db.commit()
        return self.get_settings(db)


settings_service = SettingsService()
