#!/usr/bin/env python3
"""Import reviewed, licensed photo records into the WordRun picture deck."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import urlparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "src/game/oxford-pictures.ts"
ART = ROOT / "public/art/words/oxford"
GROUPS = {"people", "animals", "objects", "places", "food"}
LEVELS = {"A1", "A2", "B1", "B2"}
LICENSES = {
    "CC BY": r"https?://creativecommons\.org/licenses/by/\S+",
    "CC BY-SA": r"https?://creativecommons\.org/licenses/by-sa/\S+",
    "CC0": r"https?://creativecommons\.org/publicdomain/zero/1\.0/(?:deed\.[a-zA-Z-]+)?",
    "Public domain": r"https?://creativecommons\.org/publicdomain/mark/1\.0/(?:deed\.[a-zA-Z-]+)?",
}


def verify_credit(entry):
    license_name = entry["license"]
    for name, pattern in LICENSES.items():
        if (license_name == name or license_name.startswith(name + " ")) and re.fullmatch(
            pattern, entry["license_url"]
        ):
            break
    else:
        raise ValueError(f"{entry['word']}: missing a supported open licence")
    if not entry["author"].strip() or urlparse(entry["file"]).scheme != "https":
        raise ValueError(f"{entry['word']}: missing author or HTTPS source")


def render_card(source):
    with Image.open(source) as photo:
        if min(photo.size) < 100:
            raise ValueError(f"{source}: too small")
        photo = ImageOps.exif_transpose(photo).convert("RGB")
        photo.thumbnail((160, 160), Image.Resampling.LANCZOS)
        card = Image.new("RGB", (168, 168), "#f7eed7")
        card.paste(photo, ((168 - photo.width) // 2, (168 - photo.height) // 2))
        output = io.BytesIO()
        card.save(output, format="WEBP", quality=89, method=6)
        return output.getvalue()


def load_records(paths):
    for path in paths:
        with path.open() as source:
            yield from json.load(source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", required=True, type=Path, help="Local Oxford headword-to-CEFR JSON")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--missing", type=Path, help="Write uncovered headwords and CEFR levels as JSON")
    parser.add_argument("packs", nargs="*", type=Path, help="Reviewed JSON files with local images and credits")
    args = parser.parse_args()
    reference = json.loads(args.reference.read_text())
    if not isinstance(reference, dict) or len(reference) < 2900:
        raise ValueError("Expected an Oxford 3000 headword-to-CEFR reference")
    source = MANIFEST.read_text().rstrip()
    rows = [json.loads(line.strip().rstrip(",")) for line in source.splitlines() if line.startswith("  [")]
    vocabulary = (ROOT / "src/game/vocabulary.ts").read_text().split("export type WordGroup", 1)[0]
    legacy = {word.lower() for word in re.findall(r'"([A-Za-z][A-Za-z -]*)"', vocabulary)}
    known = {row[2].lower() for row in rows} | legacy
    initial_count = len(known & reference.keys())
    seen = {hashlib.sha256(path.read_bytes()).digest() for path in ART.glob("*.webp")}
    next_id = max(int(row[-1]) for row in rows) + 1
    additions = []
    for entry in load_records(args.packs):
        word = entry["word"].strip().lower()
        if word in known:
            continue
        level = reference.get(word)
        if level not in LEVELS or entry["group"] not in GROUPS or not entry["topic"].strip():
            raise ValueError(f"{word}: missing valid Oxford level, group or topic")
        verify_credit(entry)
        photo = render_card(entry["local_file"])
        digest = hashlib.sha256(photo).digest()
        if digest in seen:
            raise ValueError(f"{word}: this image already appears in the picture deck")
        seen.add(digest)
        known.add(word)
        asset_id = str(next_id).zfill(3)
        next_id += 1
        row = [entry["group"], entry["topic"], word, level, asset_id]
        attribution = " | ".join(
            (asset_id, word, entry["author"], f'{entry["license"]} ({entry["license_url"]})', entry["file"])
        )
        additions.append((row, photo, attribution))

    covered = len(known & reference.keys())
    print(f"Oxford picture coverage: {initial_count} -> {covered} of {len(reference)} reference headwords; {len(additions)} new photos.")
    if args.missing:
        missing = {word: level for word, level in reference.items() if word not in known}
        args.missing.write_text(json.dumps(missing, ensure_ascii=False, indent=2) + "\n")
    if args.dry_run or not additions:
        return
    for row, photo, _ in additions:
        (ART / f"{row[-1]}.webp").write_bytes(photo)
    MANIFEST.write_text(source[:-2] + "".join(f"  {json.dumps(row)},\n" for row, _, _ in additions) + "];\n")
    with (ART / "credits.txt").open("a") as credits:
        credits.write("\nReviewed photographs (resized and converted to WebP under their source licences)\n")
        for _, _, attribution in additions:
            credits.write(f"{attribution}\n")


if __name__ == "__main__":
    main()
