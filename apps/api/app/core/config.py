from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    POSTGRES_USER: str = "nexus"
    POSTGRES_PASSWORD: str = "nexus_dev_password"
    POSTGRES_DB: str = "nexus"
    DATABASE_URL: str = "postgresql+asyncpg://nexus:nexus_dev_password@localhost:5432/nexus"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "change_me"
    JWT_ACCESS_EXPIRES_MIN: int = 30
    JWT_REFRESH_EXPIRES_DAYS: int = 14
    ENV: str = "development"

settings = Settings()
