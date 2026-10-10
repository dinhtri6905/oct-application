import json
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_model_signature_and_notebook_custom_layers_match():
    with zipfile.ZipFile(ROOT / "model" / "maxvit_oct.keras") as archive:
        config = json.loads(archive.read("config.json"))
        metadata = json.loads(archive.read("metadata.json"))
    layers = config["config"]["layers"]
    assert layers[0]["config"]["batch_shape"] == [None, 224, 224, 3]
    assert layers[-1]["config"]["units"] == 4
    assert layers[-1]["config"]["activation"] == "softmax"
    assert metadata["keras_version"] == "3.13.2"

    notebook = json.loads((ROOT / "model" / "maxvit_oct.ipynb").read_text(encoding="utf-8"))
    source = next("".join(cell["source"]) for cell in notebook["cells"]
                  if "class MaxViTBlock" in "".join(cell.get("source", [])))
    definitions = source[:source.index("def build_maxvit(")]
    implementation = (ROOT / "backend" / "app" / "maxvit_layers.py").read_text(encoding="utf-8")
    assert implementation.endswith(definitions)
