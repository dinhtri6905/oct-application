import os
from pathlib import Path
from sqlalchemy.engine import URL

DATABASE_URL = os.getenv("DATABASE_URL") or URL.create(
    "postgresql+psycopg",
    username=os.getenv("DB_USER", "oct"),
    password=os.getenv("DB_PASSWORD", "oct_local_password"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "oct"),
)
DATA_DIR = Path(os.getenv("DATA_DIR", "/data/images"))
MODEL_PATH = Path(os.getenv("MODEL_PATH", "/model/maxvit_oct.keras"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SESSION_DAYS = 7
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
