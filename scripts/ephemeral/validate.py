"""Validate a GitHub static-site artifact before extracting it on a privileged runner."""

import json
import pathlib
import re
import shutil
import stat
import sys
import tempfile
import zipfile

MAX_BYTES = 250 * 1024 * 1024
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_ENTRIES = 15000
EXTENSIONS = {
    ".html", ".js", ".mjs", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg",
    ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".wasm", ".txt",
}
TEXT_EXTENSIONS = {".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt"}
FORBIDDEN_NAMES = {
    "armtoken.json", "foundrytoken.json", "subscriptionids.json", "host.json",
    "function.json", "local.settings.json", "package.json", "package-lock.json",
}
LOCAL_TOKEN_MARKERS = (b"/__dev/armToken", b"jsonImport/", b"armToken.json", b"foundryToken.json")
JWT = re.compile(rb"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")


def checked_path(name):
    path = pathlib.PurePosixPath(name)
    if (
        not name or "\\" in name or ":" in name or name.startswith("/")
        or any(ord(char) < 32 for char in name)
        or any(part in {"", ".", ".."} or part.startswith(".") for part in name.rstrip("/").split("/"))
        or any(part.casefold() in {"api", "node_modules", "jsonimport"} for part in path.parts)
        or any(part.endswith((" ", ".")) for part in path.parts)
    ):
        raise ValueError(f"Unsafe archive path: {name!r}")
    if path.name.casefold() in FORBIDDEN_NAMES:
        raise ValueError(f"Non-preview file in artifact: {name!r}")
    return path


def validate_content(path, content):
    if path.suffix.lower() not in EXTENSIONS:
        raise ValueError(f"Unsupported static file: {path}")
    if path.suffix.lower() in TEXT_EXTENSIONS:
        if any(marker in content for marker in LOCAL_TOKEN_MARKERS) or JWT.search(content):
            raise ValueError(f"Credential or local token-loader content found in {path}")
    if str(path) == "index.html" and b"<html" not in content.lower():
        raise ValueError("The preview entry document is not HTML.")


def extract(archive, destination, config=None):
    destination = pathlib.Path(destination)
    if destination.exists():
        raise ValueError("Preview extraction destination must not already exist.")
    config = pathlib.Path(config) if config else pathlib.Path(__file__).with_name("staticwebapp.config.json")
    config_content = config.read_bytes()
    configuration = json.loads(config_content)
    # SWA requires provider-specific rules; the wildcard alone does not disable sign-in.
    auth_routes = [
        {"route": "/.auth/login/aad", "statusCode": 404},
        {"route": "/.auth/login/github", "statusCode": 404},
        {"route": "/.auth/*", "statusCode": 404},
    ]
    if not isinstance(configuration, dict) or configuration.get("routes") != auth_routes:
        raise ValueError("Trusted preview configuration must retain exact aad/github 404 routes before the auth catch-all.")
    if pathlib.Path(archive).stat().st_size > MAX_BYTES:
        raise ValueError("Preview archive exceeds the compressed size limit.")
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if len(entries) > MAX_ENTRIES or sum(item.file_size for item in entries) > MAX_BYTES:
            raise ValueError("Preview archive exceeds the file count or uncompressed size limit.")
        names = set()
        paths = []
        for entry in entries:
            path = checked_path(entry.orig_filename)
            if entry.orig_filename != entry.filename:
                raise ValueError("Archive filenames must not require platform normalization.")
            key = str(path).casefold()
            if key in names:
                raise ValueError(f"Duplicate or case-colliding archive path: {path}")
            names.add(key)
            mode = stat.S_IFMT(entry.external_attr >> 16)
            if mode not in {0, stat.S_IFREG, stat.S_IFDIR} or entry.flag_bits & 1:
                raise ValueError(f"Special or encrypted archive entry: {path}")
            if entry.file_size > MAX_FILE_BYTES:
                raise ValueError(f"Static file exceeds its size limit: {path}")
            if not entry.is_dir() and path.suffix.lower() not in EXTENSIONS:
                raise ValueError(f"Unsupported static file: {path}")
            paths.append((entry, path))
        if not any(entry.filename == "index.html" and not entry.is_dir() for entry in entries):
            raise ValueError("Preview artifact must contain index.html at its root.")

        destination.mkdir()
        total = 0
        try:
            for entry, path in paths:
                target = destination.joinpath(*path.parts)
                if entry.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                with source.open(entry) as stream:
                    content = stream.read(MAX_FILE_BYTES + 1)
                total += len(content)
                if len(content) > MAX_FILE_BYTES or total > MAX_BYTES or len(content) != entry.file_size:
                    raise ValueError("Preview decompression exceeded its size limits.")
                validate_content(path, content)
                # The PR cannot supply hosting policy or execution hooks to the publisher.
                if str(path).casefold() == "staticwebapp.config.json":
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("xb") as output:
                    output.write(content)
            (destination / "staticwebapp.config.json").write_bytes(config_content)
        except Exception:
            shutil.rmtree(destination)
            raise


def check_directory(source, destination):
    source = pathlib.Path(source).resolve()
    with tempfile.TemporaryDirectory(prefix="laux-preview-") as temporary:
        archive = pathlib.Path(temporary) / "preview.zip"
        total = 0
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
            for path in source.rglob("*"):
                relative = path.relative_to(source).as_posix()
                checked_path(relative)
                if path.is_symlink():
                    raise ValueError(f"Preview output contains a symlink: {relative}")
                if path.is_dir():
                    continue
                if not path.is_file():
                    raise ValueError(f"Preview output contains a special file: {relative}")
                size = path.stat().st_size
                total += size
                if size > MAX_FILE_BYTES or total > MAX_BYTES:
                    raise ValueError("Preview output exceeds its size limits.")
                output.write(path, relative)
        extract(archive, destination)


if __name__ == "__main__":
    directory_mode = len(sys.argv) == 4 and sys.argv[1] == "--directory"
    if not directory_mode and len(sys.argv) != 3:
        sys.exit("Usage: validate.py [--directory] <artifact.zip-or-directory> <new-output-directory>")
    try:
        if directory_mode:
            check_directory(sys.argv[2], sys.argv[3])
        else:
            extract(sys.argv[1], sys.argv[2])
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError) as error:
        sys.exit(f"Preview artifact rejected: {error}")
