import pathlib
import stat
import tempfile
import unittest
import warnings
import zipfile
from unittest.mock import patch

import validate


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temporary.name)
        self.archive = self.root / "artifact.zip"
        self.destination = self.root / "site"

    def tearDown(self):
        self.temporary.cleanup()

    def write_archive(self, entries=None):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, content in entries or [("index.html", b"<html></html>"), ("assets/app.js", b"console.log('preview')")]:
                if isinstance(name, str):
                    entry = zipfile.ZipInfo(name)
                    entry.filename = name
                    entry.orig_filename = name
                    entry.compress_type = zipfile.ZIP_DEFLATED
                else:
                    entry = name
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", message="Duplicate name:")
                    archive.writestr(entry, content)

    def reject(self, entries):
        self.write_archive(entries)
        with self.assertRaises((ValueError, OSError, zipfile.BadZipFile)):
            validate.extract(self.archive, self.destination)
        self.assertFalse(self.destination.exists())

    def test_real_archive_is_extracted_and_trusted_hosting_config_replaces_pr_config(self):
        self.write_archive([
            ("index.html", b"<html></html>"),
            ("assets/app.js", b"const local = true;"),
            ("staticwebapp.config.json", b'{"platform":{"apiRuntime":"node:20"}}'),
        ])
        validate.extract(self.archive, self.destination)
        self.assertEqual((self.destination / "assets/app.js").read_bytes(), b"const local = true;")
        self.assertEqual(
            (self.destination / "staticwebapp.config.json").read_bytes(),
            pathlib.Path(validate.__file__).with_name("staticwebapp.config.json").read_bytes(),
        )

    def test_paths_cannot_escape_or_hide_files(self):
        for name in ["../outside.js", "/outside.js", "C:/outside.js", "\\\\host\\outside.js", "assets\\a.js",
                     "a/../../outside.js", "./a.js", ".env", "api/run.js", "node_modules/lib.js",
                     "assets/.hidden.js", "a//b.js", "a /b.js", "a\nb.js"]:
            with self.subTest(name=name):
                self.reject([("index.html", b"<html></html>"), (name, b"content")])

    def test_symlinks_are_rejected_before_extraction(self):
        entry = zipfile.ZipInfo("assets/link.js")
        entry.create_system = 3
        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.reject([("index.html", b"<html></html>"), (entry, b"../../outside")])

    def test_duplicates_and_case_collisions_are_rejected(self):
        for names in [("a.js", "a.js"), ("a.js", "A.js"), ("assets/", "ASSETS/")]:
            with self.subTest(names=names):
                self.reject([("index.html", b"<html></html>"), (names[0], b""), (names[1], b"")])

    def test_requires_exact_regular_html_entry_document(self):
        for entries in [[("INDEX.HTML", b"<html></html>")], [("index.html/", b"")],
                        [("assets/app.js", b"")], [("index.html", b"not html")]]:
            self.reject(entries)

    def test_token_files_and_backend_files_are_rejected(self):
        for name in ["armToken.json", "foundryToken.json", "subscriptionIds.json", "host.json",
                     "function.json", "local.settings.json", "package.json", "handler.py", "function.wasm.exe"]:
            with self.subTest(name=name):
                self.reject([("index.html", b"<html></html>"), (name, b"{}")])

    def test_bundle_token_loaders_and_jwts_are_rejected(self):
        for content in [
            b'fetch("/__dev/armToken")', b'import("./jsonImport/test.json")', b"armToken.json",
            b"foundryToken.json", b"eyJ" + b"a" * 16 + b"." + b"b" * 16 + b"." + b"c" * 16,
        ]:
            with self.subTest(content=content):
                self.reject([("index.html", b"<html></html>"), ("assets/app.js", content)])

    def test_limits_are_checked_with_real_compressed_bytes(self):
        self.write_archive([("index.html", b"<html></html>"), ("assets/large.js", b"a" * 2048)])
        with patch.object(validate, "MAX_FILE_BYTES", 1024):
            with self.assertRaises(ValueError):
                validate.extract(self.archive, self.destination)
        with patch.object(validate, "MAX_BYTES", 1024):
            with self.assertRaises(ValueError):
                validate.extract(self.archive, self.destination)
        with patch.object(validate, "MAX_ENTRIES", 1):
            with self.assertRaises(ValueError):
                validate.extract(self.archive, self.destination)
        self.assertFalse(self.destination.exists())

    def test_corrupt_zip_is_rejected(self):
        self.archive.write_bytes(b"not a zip")
        with self.assertRaises(zipfile.BadZipFile):
            validate.extract(self.archive, self.destination)
        self.assertFalse(self.destination.exists())

    def test_existing_destination_is_never_overwritten_or_removed(self):
        self.write_archive()
        self.destination.mkdir()
        sentinel = self.destination / "keep.txt"
        sentinel.write_text("keep")
        with self.assertRaises(ValueError):
            validate.extract(self.archive, self.destination)
        self.assertEqual(sentinel.read_text(), "keep")

    def test_directory_check_includes_hidden_files(self):
        source = self.root / "dist"
        source.mkdir()
        (source / "index.html").write_text("<html></html>")
        (source / ".env").write_text("must not ship")
        with self.assertRaises(ValueError):
            validate.check_directory(source, self.destination)
        self.assertFalse(self.destination.exists())

    def test_directory_check_uses_the_same_archive_validation(self):
        source = self.root / "dist"
        source.mkdir()
        (source / "index.html").write_text("<html></html>")
        validate.check_directory(source, self.destination)
        self.assertTrue((self.destination / "index.html").is_file())
        self.assertTrue((self.destination / "staticwebapp.config.json").is_file())


if __name__ == "__main__":
    unittest.main()
