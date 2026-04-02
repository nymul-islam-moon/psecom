from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DB_HOST: str = "mysql"
    DB_PORT: int = 3306
    DB_NAME: str = "personal_economy"
    DB_USER: str = "root"
    DB_PASSWORD: str = "rootpassword"

    # Discord
    DISCORD_TOKEN: str = ""
    DISCORD_CHANNEL_ID: int = 0

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8100

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


settings = Settings()
