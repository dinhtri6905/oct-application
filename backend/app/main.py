import asyncio
import hashlib
import io
import logging
import re
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import COOKIE_SECURE, DATA_DIR, MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES, SESSION_DAYS
from .db import Base, LoginSession, Prediction, User, engine, get_db, utcnow
from .inference import CLASS_NAMES, PREPROCESSING_VERSION, ModelUnavailable, inference
from .security import COOKIE_NAME, current_user, get_login_session, new_session, password_hash, require_csrf

log = logging.getLogger(__name__)
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


@asynccontextmanager
async def lifespan(_: FastAPI):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    await asyncio.to_thread(inference.load)
    yield


app = FastAPI(title="OCT Vision AI API", version="1.0", lifespan=lifespan)


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProfileBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class FeedbackBody(BaseModel):
    correct: bool
    actualClass: str


def user_json(user: User, csrf_token: str) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email,
            "createdAt": user.created_at.isoformat(), "csrfToken": csrf_token}


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME, token, httponly=True, secure=COOKIE_SECURE,
        samesite="strict", max_age=SESSION_DAYS * 24 * 3600, path="/",
    )


def record_json(item: Prediction) -> dict:
    feedback = None
    if item.feedback_correct is not None and item.feedback_class:
        feedback = {
            "correct": item.feedback_correct, "actualClass": item.feedback_class,
            "createdAt": item.feedback_created_at.isoformat(), "status": "unverified",
        }
    return {
        "source": "model", "id": item.id, "displayName": item.display_name,
        "imageDataUrl": f"/api/v1/predictions/{item.id}/image",
        "imageWidth": item.width, "imageHeight": item.height, "sizeBytes": item.size_bytes,
        "predictedClass": item.predicted_class,
        "classScores": {"CNV": item.score_cnv, "DME": item.score_dme,
                        "DRUSEN": item.score_drusen, "NORMAL": item.score_normal},
        "modelVersion": item.model_version,
        "preprocessingVersion": item.preprocessing_version,
        "createdAt": item.created_at.isoformat(), "feedback": feedback,
    }


def owned_prediction(db: Session, user: User, prediction_id: str) -> Prediction:
    item = db.get(Prediction, prediction_id)
    if item is None or item.owner_id != user.id:
        raise HTTPException(404, "Không tìm thấy kết quả phân tích.")
    return item


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "modelReady": inference.ready}


@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    name = " ".join(body.name.split())
    if len(name) < 2:
        raise HTTPException(422, "Tên phải có ít nhất hai ký tự.")
    email = str(body.email).lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email này đã được sử dụng.")
    user = User(name=name, email=email, password_hash=password_hash.hash(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email này đã được sử dụng.") from None
    token, session = new_session(db, user)
    set_session_cookie(response, token)
    return user_json(user, session.csrf_token)


@app.post("/api/v1/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(body.email).lower()))
    if user is None or not password_hash.verify(body.password, user.password_hash):
        raise HTTPException(401, "Email hoặc mật khẩu không đúng.")
    token, session = new_session(db, user)
    set_session_cookie(response, token)
    return user_json(user, session.csrf_token)


@app.get("/api/v1/auth/me")
def me(session: LoginSession = Depends(get_login_session), user: User = Depends(current_user)):
    return user_json(user, session.csrf_token)


@app.post("/api/v1/auth/logout", status_code=204)
def logout(response: Response, session: LoginSession = Depends(require_csrf), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/", samesite="strict", secure=COOKIE_SECURE)


@app.patch("/api/v1/auth/profile")
def update_profile(body: ProfileBody, session: LoginSession = Depends(require_csrf),
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    name = " ".join(body.name.split())
    if len(name) < 2:
        raise HTTPException(422, "Tên phải có ít nhất hai ký tự.")
    user.name = name
    db.commit()
    return user_json(user, session.csrf_token)


@app.get("/api/v1/model")
def model_info(_: User = Depends(current_user)):
    return {"name": "MaxViT-OCT", "version": inference.version,
            "ready": inference.ready, "classes": CLASS_NAMES,
            "input": "RGB 224×224, bilinear, pixel / 255; TTA horizontal flip",
            "preprocessingVersion": PREPROCESSING_VERSION,
            "error": None if inference.ready else "Mô hình chưa sẵn sàng."}


def validate_upload(raw: bytes) -> tuple[bytes, str, int, int]:
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            fmt, width, height = probe.format, *probe.size
            if fmt not in ("JPEG", "PNG"):
                raise HTTPException(415, "Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.")
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(413, "Kích thước ảnh vượt giới hạn xử lý.")
            probe.verify()
        with Image.open(io.BytesIO(raw)) as source:
            rgb = source.convert("RGB")
            output = io.BytesIO()
            mime = "image/jpeg" if fmt == "JPEG" else "image/png"
            rgb.save(output, format="JPEG" if fmt == "JPEG" else "PNG", quality=95)
        return output.getvalue(), mime, width, height
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, "Không thể đọc ảnh. Hãy chọn ảnh JPG hoặc PNG hợp lệ.") from None


def read_upload(image: UploadFile) -> bytes:
    raw = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Ảnh vượt quá 10 MB.")
    if not raw:
        raise HTTPException(422, "Ảnh rỗng. Hãy chọn ảnh khác.")
    return raw


def write_image(storage_key: str, content: bytes) -> None:
    path = DATA_DIR / storage_key
    with path.open("xb") as output:
        output.write(content)


@app.post("/api/v1/predictions", status_code=201)
def create_prediction(image: UploadFile = File(...),
                            idempotency_key: str | None = Header(default=None),
                            _: LoginSession = Depends(require_csrf),
                            user: User = Depends(current_user), db: Session = Depends(get_db)):
    if idempotency_key and (len(idempotency_key) > 100 or not re.fullmatch(r"[A-Za-z0-9_-]+", idempotency_key)):
        raise HTTPException(400, "Idempotency-Key không hợp lệ.")
    raw = read_upload(image)
    digest = hashlib.sha256(raw).hexdigest()
    if idempotency_key:
        existing = db.scalar(select(Prediction).where(
            Prediction.owner_id == user.id, Prediction.idempotency_key == idempotency_key))
        if existing:
            if existing.sha256 != digest:
                raise HTTPException(409, "Khóa yêu cầu đã được dùng cho ảnh khác.")
            return record_json(existing)
    content, mime, width, height = validate_upload(raw)
    try:
        scores = inference.predict(raw)
    except ModelUnavailable as exc:
        raise HTTPException(503, str(exc)) from None
    except Exception:
        log.exception("Model inference failed")
        raise HTTPException(503, "Không thể phân tích ảnh lúc này. Vui lòng thử lại.") from None
    predicted = max(CLASS_NAMES, key=lambda code: scores[code])
    record_id = str(uuid4())
    extension = "jpg" if mime == "image/jpeg" else "png"
    storage_key = f"{uuid4().hex}.{extension}"
    record = Prediction(
        id=record_id, owner_id=user.id, storage_key=storage_key,
        display_name=f"oct-{record_id[:8]}.{extension}", mime=mime,
        width=width, height=height, size_bytes=len(raw), sha256=digest,
        predicted_class=predicted, score_cnv=scores["CNV"], score_dme=scores["DME"],
        score_drusen=scores["DRUSEN"], score_normal=scores["NORMAL"],
        model_version=inference.version, preprocessing_version=PREPROCESSING_VERSION,
        idempotency_key=idempotency_key,
    )
    try:
        write_image(storage_key, content)
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        (DATA_DIR / storage_key).unlink(missing_ok=True)
        if idempotency_key:
            existing = db.scalar(select(Prediction).where(
                Prediction.owner_id == user.id, Prediction.idempotency_key == idempotency_key))
            if existing and existing.sha256 == digest:
                return record_json(existing)
        raise HTTPException(409, "Yêu cầu phân tích bị trùng.") from None
    except Exception:
        db.rollback()
        (DATA_DIR / storage_key).unlink(missing_ok=True)
        log.exception("Cannot save prediction")
        raise HTTPException(500, "Không thể lưu kết quả. Vui lòng thử lại.") from None
    return record_json(record)


@app.get("/api/v1/predictions")
def list_predictions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Prediction).where(Prediction.owner_id == user.id)
                       .order_by(Prediction.created_at.desc())).all()
    return [record_json(item) for item in items]


@app.get("/api/v1/predictions/{prediction_id}")
def get_prediction(prediction_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return record_json(owned_prediction(db, user, prediction_id))


@app.get("/api/v1/predictions/{prediction_id}/image")
def prediction_image(prediction_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = owned_prediction(db, user, prediction_id)
    path = DATA_DIR / item.storage_key
    if not path.is_file():
        raise HTTPException(404, "Ảnh không còn khả dụng.")
    return FileResponse(path, media_type=item.mime, headers={"Cache-Control": "private, no-store"})


@app.patch("/api/v1/predictions/{prediction_id}/feedback")
def save_feedback(prediction_id: str, body: FeedbackBody,
                  _: LoginSession = Depends(require_csrf), user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    item = owned_prediction(db, user, prediction_id)
    if body.actualClass not in CLASS_NAMES or body.correct != (body.actualClass == item.predicted_class):
        raise HTTPException(422, "Phản hồi không phù hợp với lớp dự đoán.")
    item.feedback_correct = body.correct
    item.feedback_class = body.actualClass
    item.feedback_created_at = utcnow()
    db.commit()
    return record_json(item)


@app.delete("/api/v1/predictions/{prediction_id}", status_code=204)
def delete_prediction(prediction_id: str, _: LoginSession = Depends(require_csrf),
                      user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = owned_prediction(db, user, prediction_id)
    key = item.storage_key
    db.delete(item)
    db.commit()
    (DATA_DIR / key).unlink(missing_ok=True)


@app.delete("/api/v1/predictions", status_code=204)
def clear_predictions(_: LoginSession = Depends(require_csrf),
                      user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Prediction).where(Prediction.owner_id == user.id)).all()
    keys = [item.storage_key for item in items]
    db.execute(delete(Prediction).where(Prediction.owner_id == user.id))
    db.commit()
    for key in keys:
        (DATA_DIR / key).unlink(missing_ok=True)


@app.get("/api/v1/summary")
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Prediction).where(Prediction.owner_id == user.id)
                       .order_by(Prediction.created_at.desc())).all()
    return {"total": len(items), "counts": {code: sum(item.predicted_class == code for item in items)
                                           for code in CLASS_NAMES},
            "recent": [record_json(item) for item in items[:5]]}
