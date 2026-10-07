from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    POSTGRES_USER: str = "nexus"
    POSTGRES_PASSWORD: str = "nexus_dev_password"
    POSTGRES_DB: str = "nexus"
    DATABASE_URL: str = "postgresql+asyncpg://nexus:nexus_dev_password@localhost:5432/nexus"
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str = ""
    JWT_SECRET: str = "change_me"
    GEMINI_API_KEY: str = ""
    GOOGLE_BOOKS_API_KEY: str = ""
    JWT_ACCESS_EXPIRES_MIN: int = 30
    JWT_REFRESH_EXPIRES_DAYS: int = 14
    ENV: str = "development"

settings = Settings()
