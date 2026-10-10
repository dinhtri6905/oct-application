"""Model serving using the exact preprocessing and TTA from the training notebook."""
import hashlib
import json
import logging
import math
import threading
import zipfile

from .config import MODEL_PATH

log = logging.getLogger(__name__)
CLASS_NAMES = ("CNV", "DME", "DRUSEN", "NORMAL")
PREPROCESSING_VERSION = "notebook-v2-rgb224-bilinear-0to1-tta-flip"


class ModelUnavailable(Exception):
    pass


class InferenceService:
    def __init__(self):
        self.model = None
        self.error: str | None = None
        self.version = "unknown"
        self.lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        if self.ready:
            return
        try:
            if not MODEL_PATH.is_file():
                raise FileNotFoundError(f"Model artifact missing: {MODEL_PATH}")
            with zipfile.ZipFile(MODEL_PATH) as archive:
                metadata = json.loads(archive.read("metadata.json"))
                config = json.loads(archive.read("config.json"))
            if config["config"]["layers"][0]["config"]["batch_shape"] != [None, 224, 224, 3]:
                raise ValueError("Unexpected model input shape")
            if config["config"]["layers"][-1]["config"].get("units") != 4:
                raise ValueError("Unexpected model output shape")
            import keras
            from .maxvit_layers import MaxViTBlock
            # compile=False avoids deserializing custom training-only loss/metrics/schedule.
            model = keras.saving.load_model(
                MODEL_PATH, custom_objects={"MaxViTBlock": MaxViTBlock},
                compile=False, safe_mode=True,
            )
            if tuple(model.input_shape[1:]) != (224, 224, 3) or tuple(model.output_shape[1:]) != (4,):
                raise ValueError("Loaded model signature does not match the notebook")
            digest = hashlib.sha256()
            with MODEL_PATH.open("rb") as model_file:
                for block in iter(lambda: model_file.read(1024 * 1024), b""):
                    digest.update(block)
            self.version = f"{metadata.get('date_saved', 'unknown')}-{digest.hexdigest()[:12]}"
            self.model = model
            self.error = None
            log.info("Loaded OCT model %s", self.version)
        except Exception as exc:
            self.error = str(exc)
            log.exception("Cannot load OCT model")

    def predict(self, image_bytes: bytes) -> dict[str, float]:
        if not self.ready:
            raise ModelUnavailable("Mô hình AI hiện chưa sẵn sàng. Vui lòng thử lại sau.")
        import numpy as np
        import tensorflow as tf

        # Matches decode_and_prepare() and TTA_FLIP=True in maxvit_oct.ipynb.
        image = tf.io.decode_image(image_bytes, channels=0, expand_animations=False)
        image.set_shape([None, None, None])
        channels = tf.shape(image)[-1]
        image = tf.cond(
            tf.equal(channels, 1),
            lambda: tf.image.grayscale_to_rgb(image),
            lambda: tf.cond(tf.equal(channels, 4), lambda: image[:, :, :3], lambda: image),
        )
        image.set_shape([None, None, 3])
        image = tf.image.resize(image, (224, 224), method="bilinear")
        image = tf.cast(image, tf.float32) / 255.0
        batch = tf.stack([image, tf.image.flip_left_right(image)])
        with self.lock:
            output = np.asarray(self.model(batch, training=False), dtype=np.float64)
        if output.shape != (2, 4):
            raise ValueError("Model returned an unexpected output shape")
        scores = output.mean(axis=0)
        if not all(math.isfinite(float(score)) and 0 <= score <= 1 for score in scores):
            raise ValueError("Model returned invalid class scores")
        if abs(float(scores.sum()) - 1.0) > 0.01:
            raise ValueError("Model scores do not sum to one")
        return dict(zip(CLASS_NAMES, map(float, scores)))


inference = InferenceService()
