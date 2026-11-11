"""Resume ingestion, security validation, deduplication, and text extraction service.

Enforces strict defense-in-depth:
1. File size limits (<= 5 MB).
2. Magic-byte verification (%PDF- for PDF, PK\x03\x04 + word/document.xml for DOCX).
3. DOCX Zip-bomb checks: uncompressed size limit (25 MB), compression ratio (< 100x), entry count (< 500).
4. PDF page limit: <= 5 pages.
5. Extracted text cap: <= 50,000 characters.
6. Safe storage: paths strictly derived from SHA-256 hash (<hash>.<ext>), never untrusted user filenames.
7. Deduplication: exact hash matches return existing record with optional label update.
"""
import io
import os
import re
import hashlib
import zipfile
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

import pypdf
import docx

logger = logging.getLogger(__name__)

# Security & validation constraints
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_PDF_PAGES = 5
MAX_EXTRACTED_TEXT_LENGTH = 50_000  # 50k chars
MAX_DOCX_UNCOMPRESSED_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_DOCX_ZIP_RATIO = 100.0  # Max compression ratio
MAX_DOCX_ZIP_ENTRIES = 500

# Base storage directory outside web root
RESUME_STORAGE_DIR = Path(os.getenv("ARGUS_RESUME_STORAGE_DIR", Path(__file__).resolve().parent.parent.parent / "data" / "resumes"))


class ResumeValidationError(Exception):
    """Custom exception raised for invalid or insecure resume files."""
    pass


def sanitize_display_filename(filename: str, fallback_ext: str = "pdf") -> str:
    """Sanitizes an untrusted filename for display and download headers only."""
    if not filename:
        return f"resume.{fallback_ext}"
    # Strip any directory traversal components
    base_name = os.path.basename(filename.strip().replace("\\", "/"))
    # Remove control characters and unsafe punctuation
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '_', base_name)
    clean_name = clean_name.strip(" .")
    if not clean_name:
        return f"resume.{fallback_ext}"
    if not (clean_name.lower().endswith(".pdf") or clean_name.lower().endswith(".docx")):
        clean_name = f"{clean_name}.{fallback_ext}"
    return clean_name[:150]


def check_docx_zip_bomb(file_bytes: bytes) -> None:
    """Inspects a zip archive for zip-bomb characteristics before decompression."""
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            infolist = zf.infolist()
            if len(infolist) > MAX_DOCX_ZIP_ENTRIES:
                raise ResumeValidationError(
                    f"DOCX archive contains too many files ({len(infolist)} > {MAX_DOCX_ZIP_ENTRIES})."
                )

            total_uncompressed = 0
            has_word_document = False

            for info in infolist:
                # Disallow absolute paths or parent directory traversal in zip
                if info.filename.startswith(("/", "\\")) or ".." in info.filename:
                    raise ResumeValidationError("Malicious path detected inside DOCX archive.")

                total_uncompressed += info.file_size
                if total_uncompressed > MAX_DOCX_UNCOMPRESSED_SIZE:
                    raise ResumeValidationError(
                        f"DOCX uncompressed size exceeds security threshold ({total_uncompressed} > {MAX_DOCX_UNCOMPRESSED_SIZE} bytes)."
                    )

                if info.filename == "word/document.xml":
                    has_word_document = True

            compressed_size = max(len(file_bytes), 1)
            ratio = total_uncompressed / compressed_size
            if ratio > MAX_DOCX_ZIP_RATIO:
                raise ResumeValidationError(
                    f"DOCX compression ratio is suspiciously high ({ratio:.1f}x > {MAX_DOCX_ZIP_RATIO}x)."
                )

            if not has_word_document:
                raise ResumeValidationError("Invalid DOCX format: missing word/document.xml entry.")

    except zipfile.BadZipFile as exc:
        raise ResumeValidationError(f"Invalid DOCX file archive: {str(exc)}")


def detect_file_type_and_validate(file_bytes: bytes) -> Tuple[str, str]:
    """Validates magic bytes and returns (mime_type, extension).

    Returns:
        ("application/pdf", "pdf") or ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")
    Raises:
        ResumeValidationError if file is invalid or unsupported.
    """
    if len(file_bytes) == 0:
        raise ResumeValidationError("Uploaded file is empty (0 bytes).")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ResumeValidationError(
            f"File size exceeds maximum allowed size ({len(file_bytes)} > {MAX_FILE_SIZE} bytes)."
        )

    # PDF magic byte check: %PDF-
    if file_bytes.startswith(b"%PDF-"):
        return "application/pdf", "pdf"

    # DOCX check: Zip magic byte PK\x03\x04
    if file_bytes.startswith(b"PK\x03\x04"):
        check_docx_zip_bomb(file_bytes)
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"

    raise ResumeValidationError(
        "Unsupported or corrupt file type. Only standard PDF (%PDF-) and DOCX (Word) documents are supported."
    )


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes enforcing page and length limits."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        num_pages = len(reader.pages)

        if num_pages == 0:
            raise ResumeValidationError("PDF document contains 0 pages.")
        if num_pages > MAX_PDF_PAGES:
            raise ResumeValidationError(
                f"PDF exceeds page limit ({num_pages} pages > max {MAX_PDF_PAGES} pages for SWE resumes)."
            )

        extracted_parts = []
        total_len = 0

        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            extracted_parts.append(page_text)
            total_len += len(page_text)
            if total_len > MAX_EXTRACTED_TEXT_LENGTH:
                break

        full_text = "\n".join(extracted_parts).strip()
        if len(full_text) > MAX_EXTRACTED_TEXT_LENGTH:
            full_text = full_text[:MAX_EXTRACTED_TEXT_LENGTH]

        if not full_text:
            raise ResumeValidationError(
                "Could not extract text from PDF. The document may be a scanned image or empty. Please upload a text-based PDF."
            )

        return full_text

    except Exception as exc:
        if isinstance(exc, ResumeValidationError):
            raise
        raise ResumeValidationError(f"Failed to parse PDF document: {str(exc)}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts text from DOCX bytes enforcing text length caps."""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        parts = []

        for p in doc.paragraphs:
            txt = p.text.strip()
            if txt:
                parts.append(txt)

        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    parts.append(" | ".join(row_cells))

        full_text = "\n".join(parts).strip()
        if len(full_text) > MAX_EXTRACTED_TEXT_LENGTH:
            full_text = full_text[:MAX_EXTRACTED_TEXT_LENGTH]

        if not full_text:
            raise ResumeValidationError("Could not extract any text from DOCX document. File appears to be empty.")

        return full_text

    except Exception as exc:
        if isinstance(exc, ResumeValidationError):
            raise
        raise ResumeValidationError(f"Failed to parse DOCX document: {str(exc)}")


def process_resume_upload(
    file_bytes: bytes,
    original_filename: str,
    label: Optional[str] = None,
    update_label_if_exists: bool = False,
    db_manager=None,
) -> Dict[str, Any]:
    """Validates, deduplicates, extracts text, and stores a resume document.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        original_filename: Untrusted original filename from client.
        label: User-provided label for this version (defaults to sanitized filename base).
        update_label_if_exists: If True and the file already exists, updates the label.
        db_manager: DatabaseManager instance.

    Returns:
        Dict representing the resume version, with `is_duplicate` boolean flag.
    """
    if db_manager is None:
        from src.db.db_manager import DatabaseManager
        db_manager = DatabaseManager()

    # 1. Validate magic bytes and format
    mime_type, ext = detect_file_type_and_validate(file_bytes)

    # 2. Extract text with limits
    if ext == "pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
    else:
        extracted_text = extract_text_from_docx(file_bytes)

    # 3. Compute SHA-256 hash
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    safe_display_name = sanitize_display_filename(original_filename, fallback_ext=ext)
    final_label = (label or "").strip()
    if not final_label:
        final_label = os.path.splitext(safe_display_name)[0].replace("_", " ").title()

    # 4. Check for existing duplicate by hash
    existing = db_manager.get_resume_version_by_hash(file_hash)
    if existing:
        logger.info(f"Resume with hash {file_hash[:12]} already exists (ID {existing['id']}).")
        if update_label_if_exists and label and label.strip() != existing.get("label"):
            updated = db_manager.update_resume_version_label(existing["id"], label.strip())
            return {
                **updated,
                "is_duplicate": True,
                "message": "File already exists. Label updated successfully.",
            }
        return {
            **existing,
            "is_duplicate": True,
            "message": "File already exists with identical contents. Returning existing version.",
        }

    # 5. Store file securely outside web root: strictly <hash>.<ext>
    RESUME_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    storage_path = RESUME_STORAGE_DIR / f"{file_hash}.{ext}"

    # Write file to disk securely
    storage_path.write_bytes(file_bytes)

    # 6. Save metadata to database
    record = db_manager.create_resume_version(
        file_name=safe_display_name,
        file_path=str(storage_path.resolve()),
        file_size=len(file_bytes),
        file_hash=file_hash,
        mime_type=mime_type,
        label=final_label,
        extracted_text=extracted_text,
    )

    return {
        **record,
        "is_duplicate": False,
        "message": "Resume uploaded and indexed successfully.",
    }
