from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # URL del ESP32/dispositivo de luces. Vacío = no dispara webhook (modo prototipo).
    luces_webhook_url: str = ""
    # Dimensiones de la cuadrícula de cada estante.
    grid_rows: int = 5
    grid_cols: int = 6
    # Si la tira LED serpentea (zigzag) en vez de reiniciar en cada fila.
    led_zigzag: bool = True

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
