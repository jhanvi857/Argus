"""Unit tests for Phase A Resume Library: validation, extraction, security guardrails, deduplication."""
import io
import zipfile
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

import pypdf
import docx

from src.services.resume_service import (
    process_resume_upload,
    detect_file_type_and_validate,
    extract_text_from_pdf,
    extract_text_from_docx,
    check_docx_zip_bomb,
    sanitize_display_filename,
    ResumeValidationError,
    MAX_FILE_SIZE,
    MAX_PDF_PAGES,
    MAX_DOCX_UNCOMPRESSED_SIZE,
)


def create_mock_pdf_bytes(num_pages: int = 1, text_per_page: str = "Candidate Resume Experience and Skills") -> bytes:
    """Generates valid minimal in-memory PDF bytes with text using reportlab/pypdf/pdf writer."""
    # We can write minimal valid PDF stream or use pypdf / manual PDF stream
    # Minimal valid PDF with text:
    buf = io.BytesIO()
    writer = pypdf.PdfWriter()
    for i in range(num_pages):
        page = writer.add_blank_page(width=612, height=792)
        # Note: blank page with annotations or text
    # Or to have extractable text, write a basic PDF structure
    # Actually, pypdf allows adding page; let's write a standard PDF structure or use pypdf's writer
    writer.write(buf)
    # To simulate extractable text for pypdf, we can mock page.extract_text or construct a text object
    return buf.getvalue()


def create_mock_docx_bytes(paragraphs: list[str]) -> bytes:
    """Generates valid minimal in-memory DOCX bytes using python-docx."""
    doc = docx.Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


class TestResumeService(unittest.TestCase):
    """Test suite for resume upload validation, extraction, and deduplication."""

    def setUp(self):
        self.mock_db = MagicMock()

    def test_sanitize_display_filename(self):
        """Verify filenames are sanitized and traversal sequences removed."""
        self.assertEqual(sanitize_display_filename("../../etc/passwd.pdf"), "passwd.pdf")
        self.assertEqual(sanitize_display_filename("..\\..\\malicious.pdf"), "malicious.pdf")
        self.assertEqual(sanitize_display_filename("normal_resume.pdf"), "normal_resume.pdf")
        self.assertEqual(sanitize_display_filename("no_extension", fallback_ext="pdf"), "no_extension.pdf")
        self.assertEqual(sanitize_display_filename(""), "resume.pdf")

    def test_empty_file_rejected(self):
        """Verify 0-byte file raises ResumeValidationError."""
        with self.assertRaises(ResumeValidationError) as ctx:
            detect_file_type_and_validate(b"")
        self.assertIn("empty", str(ctx.exception).lower())

    def test_oversized_file_rejected(self):
        """Verify file exceeding 5MB raises ResumeValidationError."""
        fake_large = b"%PDF-" + b"0" * (MAX_FILE_SIZE + 10)
        with self.assertRaises(ResumeValidationError) as ctx:
            detect_file_type_and_validate(fake_large)
        self.assertIn("exceeds maximum allowed size", str(ctx.exception))

    def test_invalid_magic_bytes_rejected(self):
        """Verify unknown or malicious file types (e.g. PE, shell scripts) are rejected."""
        with self.assertRaises(ResumeValidationError) as ctx:
            detect_file_type_and_validate(b"MZ\x90\x00\x03\x00\x00\x00")  # Windows PE exe
        self.assertIn("unsupported or corrupt", str(ctx.exception).lower())

        with self.assertRaises(ResumeValidationError):
            detect_file_type_and_validate(b"#!/bin/bash\nrm -rf /")

    def test_docx_zip_bomb_uncompressed_size_rejected(self):
        """Verify zip archive exceeding uncompressed size threshold is blocked."""
        # Create an in-memory zip where one file claims or decompresses to > 25MB
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            # Add word/document.xml with huge compressed payload
            zf.writestr("word/document.xml", b"A" * (MAX_DOCX_UNCOMPRESSED_SIZE + 100))
        zip_bytes = buf.getvalue()

        with self.assertRaises(ResumeValidationError) as ctx:
            check_docx_zip_bomb(zip_bytes)
        self.assertIn("uncompressed size exceeds", str(ctx.exception).lower())

    def test_docx_missing_document_xml_rejected(self):
        """Verify zip without word/document.xml is rejected as invalid DOCX."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("random.txt", b"Hello world")
        zip_bytes = buf.getvalue()

        with self.assertRaises(ResumeValidationError) as ctx:
            check_docx_zip_bomb(zip_bytes)
        self.assertIn("missing word/document.xml", str(ctx.exception))

    def test_pdf_page_limit_enforced(self):
        """Verify PDF exceeding MAX_PDF_PAGES (5) raises error."""
        # Mock pypdf.PdfReader with 6 pages
        with patch("pypdf.PdfReader") as mock_reader_cls:
            mock_reader = MagicMock()
            mock_reader.pages = [MagicMock() for _ in range(MAX_PDF_PAGES + 1)]
            mock_reader_cls.return_value = mock_reader

            fake_pdf = b"%PDF-1.4\n..."
            with self.assertRaises(ResumeValidationError) as ctx:
                extract_text_from_pdf(fake_pdf)
            self.assertIn("page limit", str(ctx.exception).lower())

    def test_valid_docx_extraction_and_upload(self):
        """Verify valid DOCX extracts text and creates database record."""
        docx_bytes = create_mock_docx_bytes([
            "Jane Doe",
            "Software Engineer - Distributed Systems",
            "Experience: Built high-throughput consensus storage with Raft in Go.",
            "Skills: Go, Java, Rust, Docker, Kubernetes"
        ])

        self.mock_db.get_resume_version_by_hash.return_value = None
        self.mock_db.create_resume_version.return_value = {
            "id": 1,
            "file_name": "Jane_Doe_Resume.docx",
            "file_path": "/safe/path/hash.docx",
            "file_size": len(docx_bytes),
            "file_hash": "dummyhash",
            "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "label": "Systems Resume v1",
            "extracted_text": "Jane Doe\nSoftware Engineer - Distributed Systems...",
            "created_at": "2026-11-11 20:00:00",
        }

        with patch("pathlib.Path.write_bytes") as mock_write:
            res = process_resume_upload(
                file_bytes=docx_bytes,
                original_filename="../../Jane_Doe_Resume.docx",
                label="Systems Resume v1",
                db_manager=self.mock_db,
            )

            self.assertFalse(res["is_duplicate"])
            self.assertEqual(res["id"], 1)
            self.assertEqual(res["label"], "Systems Resume v1")
            self.mock_db.create_resume_version.assert_called_once()
            mock_write.assert_called_once()

    def test_deduplication_by_hash_returns_existing(self):
        """Verify identical file returns existing version without error."""
        docx_bytes = create_mock_docx_bytes(["Identical Content for Deduplication Test"])

        existing_record = {
            "id": 42,
            "file_name": "Original.docx",
            "file_path": "/data/resumes/ab12cd.docx",
            "file_size": len(docx_bytes),
            "file_hash": "somehash",
            "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "label": "Original Label",
            "extracted_text": "Identical Content for Deduplication Test",
            "created_at": "2026-11-10 10:00:00",
        }
        self.mock_db.get_resume_version_by_hash.return_value = existing_record

        res = process_resume_upload(
            file_bytes=docx_bytes,
            original_filename="Different_Name.docx",
            label="Different Label",
            update_label_if_exists=False,
            db_manager=self.mock_db,
        )

        self.assertTrue(res["is_duplicate"])
        self.assertEqual(res["id"], 42)
        self.assertEqual(res["label"], "Original Label")
        self.mock_db.create_resume_version.assert_not_called()

    def test_deduplication_with_label_update(self):
        """Verify uploading duplicate with update_label_if_exists=True updates the label."""
        docx_bytes = create_mock_docx_bytes(["Content to be re-labeled"])

        existing_record = {
            "id": 42,
            "file_name": "Original.docx",
            "file_path": "/data/resumes/ab12cd.docx",
            "file_size": len(docx_bytes),
            "file_hash": "somehash",
            "label": "Old Label",
        }
        self.mock_db.get_resume_version_by_hash.return_value = existing_record
        self.mock_db.update_resume_version_label.return_value = {
            **existing_record,
            "label": "New Tailored Label",
        }

        res = process_resume_upload(
            file_bytes=docx_bytes,
            original_filename="Original.docx",
            label="New Tailored Label",
            update_label_if_exists=True,
            db_manager=self.mock_db,
        )

        self.assertTrue(res["is_duplicate"])
        self.assertEqual(res["label"], "New Tailored Label")
        self.mock_db.update_resume_version_label.assert_called_once_with(42, "New Tailored Label")


if __name__ == "__main__":
    unittest.main()
