from typing import Optional
from sqlalchemy.orm import Session

from app.models.system_settings import SystemSettings
from app.repositories.base import BaseRepository


class SettingsRepository(BaseRepository[SystemSettings]):
    def __init__(self, db: Session):
        super().__init__(SystemSettings, db)

    def get_by_key(self, key: str) -> Optional[SystemSettings]:
        return self.db.query(SystemSettings).filter(SystemSettings.key == key).first()

    def upsert(self, key: str, value: str, description: str = None) -> SystemSettings:
        setting = self.get_by_key(key)
        if setting:
            setting.value = value
            return self.update(setting)
        return self.create(SystemSettings(key=key, value=value, description=description))
