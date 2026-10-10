import hashlib
import secrets
from datetime import timedelta

from fastapi import Depends, Header, HTTPException, Request, status
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import SESSION_DAYS
from .db import LoginSession, User, get_db, utcnow

password_hash = PasswordHash.recommended()
COOKIE_NAME = "oct_session"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_session(db: Session, user: User) -> tuple[str, LoginSession]:
    token = secrets.token_urlsafe(48)
    session = LoginSession(
        token_hash=hash_token(token), user_id=user.id,
        csrf_token=secrets.token_urlsafe(32),
        expires_at=utcnow() + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    db.commit()
    return token, session


def get_login_session(request: Request, db: Session = Depends(get_db)) -> LoginSession:
    token = request.cookies.get(COOKIE_NAME)
    session = db.get(LoginSession, hash_token(token)) if token else None
    if session is None or session.expires_at.replace(tzinfo=session.expires_at.tzinfo or utcnow().tzinfo) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Vui lòng đăng nhập để tiếp tục.")
    return session


def current_user(session: LoginSession = Depends(get_login_session), db: Session = Depends(get_db)) -> User:
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không còn hợp lệ.")
    return user


def require_csrf(session: LoginSession = Depends(get_login_session), x_csrf_token: str | None = Header(default=None)) -> LoginSession:
    if not x_csrf_token or not secrets.compare_digest(x_csrf_token, session.csrf_token):
        raise HTTPException(status_code=403, detail="Phiên bảo mật không hợp lệ. Hãy tải lại trang.")
    return session
