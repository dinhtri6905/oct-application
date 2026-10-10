"""API contract checks with a local SQLite database and deterministic inference stub.

The model artifact is tested separately in the Docker runtime; these tests never
claim that their scores came from MaxViT.
"""
import io
import os
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

TEST_ROOT = Path(__file__).resolve().parent / ".runtime"
TEST_ROOT.mkdir(exist_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{(TEST_ROOT / 'api.sqlite').as_posix()}"
os.environ["DATA_DIR"] = str(TEST_ROOT / "images")

from app.db import Base, engine  # noqa: E402
from app.inference import inference  # noqa: E402
from app.main import app  # noqa: E402


def png(color: str = "white") -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (32, 24), color).save(output, format="PNG")
    return output.getvalue()


def register(client: TestClient, email: str):
    response = client.post("/api/v1/auth/register", json={
        "name": "Nhà nghiên cứu", "email": email, "password": "safe-password-123",
    })
    assert response.status_code == 201, response.text
    return response.json()


def run():
    (TEST_ROOT / "images").mkdir(exist_ok=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    inference.version = "test-only"
    inference.predict = lambda _: {"CNV": 0.7, "DME": 0.1, "DRUSEN": 0.1, "NORMAL": 0.1}
    owner = TestClient(app)
    stranger = TestClient(app)
    assert owner.get("/api/v1/predictions").status_code == 401
    first = register(owner, "one@example.com")
    second = register(stranger, "two@example.com")
    assert owner.get("/api/v1/auth/me").json()["id"] == first["id"]
    assert owner.post("/api/v1/auth/register", json={
        "name": "Other", "email": "one@example.com", "password": "safe-password-123",
    }).status_code == 409
    assert owner.post("/api/v1/predictions", files={"image": ("oct.png", png(), "image/png")}).status_code == 403

    headers = {"X-CSRF-Token": first["csrfToken"], "Idempotency-Key": "first-image"}
    created = owner.post("/api/v1/predictions", files={"image": ("oct.png", png(), "image/png")}, headers=headers)
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["predictedClass"] == "CNV"
    assert item["classScores"]["CNV"] == 0.7
    assert item["imageDataUrl"].endswith(f"/{item['id']}/image")
    assert owner.get(item["imageDataUrl"]).status_code == 200
    assert stranger.get(item["imageDataUrl"]).status_code == 404
    assert stranger.get(f"/api/v1/predictions/{item['id']}").status_code == 404
    assert stranger.get("/api/v1/predictions").json() == []
    assert len(owner.get("/api/v1/predictions").json()) == 1
    assert owner.get("/api/v1/summary").json()["counts"]["CNV"] == 1

    duplicate = owner.post("/api/v1/predictions", files={"image": ("oct.png", png(), "image/png")}, headers=headers)
    assert duplicate.status_code == 201 and duplicate.json()["id"] == item["id"]
    collision = owner.post("/api/v1/predictions", files={"image": ("oct.png", png("black"), "image/png")}, headers=headers)
    assert collision.status_code == 409
    bad = owner.post("/api/v1/predictions", files={"image": ("oct.png", b"not an image", "image/png")}, headers={"X-CSRF-Token": first["csrfToken"]})
    assert bad.status_code == 422
    feedback = owner.patch(f"/api/v1/predictions/{item['id']}/feedback", json={"correct": False, "actualClass": "DME"}, headers={"X-CSRF-Token": first["csrfToken"]})
    assert feedback.status_code == 200 and feedback.json()["feedback"]["actualClass"] == "DME"
    assert stranger.patch(f"/api/v1/predictions/{item['id']}/feedback", json={"correct": False, "actualClass": "DME"}, headers={"X-CSRF-Token": second["csrfToken"]}).status_code == 404
    assert stranger.delete("/api/v1/predictions", headers={"X-CSRF-Token": second["csrfToken"]}).status_code == 204
    assert len(owner.get("/api/v1/predictions").json()) == 1
    assert owner.delete(f"/api/v1/predictions/{item['id']}", headers={"X-CSRF-Token": first["csrfToken"]}).status_code == 204
    assert owner.get(item["imageDataUrl"]).status_code == 404

    assert owner.post("/api/v1/auth/logout", headers={"X-CSRF-Token": first["csrfToken"]}).status_code == 204
    assert owner.get("/api/v1/auth/me").status_code == 401
    assert owner.post("/api/v1/auth/login", json={"email": "one@example.com", "password": "wrong-password"}).status_code == 401
    assert owner.post("/api/v1/auth/login", json={"email": "one@example.com", "password": "safe-password-123"}).status_code == 200
    assert owner.get("/api/v1/auth/me").status_code == 200


def test_auth_prediction_and_owner_isolation():
    run()
