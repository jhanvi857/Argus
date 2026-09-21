"""Email digest notification service using Resend for Argus.

Dispatches aggregated digests of newly discovered relevant job opportunities
directly to the candidate's verified email address via the Resend REST API.
"""
import os
import logging
from typing import Optional, List, Dict, Any
from src.db.db_manager import DatabaseManager

logger = logging.getLogger(__name__)


def build_digest_html(postings: List[Dict[str, Any]]) -> str:
    """Renders a responsive, clean HTML email digest for job opportunities."""
    job_cards_html = ""
    for job in postings:
        title = job.get("title", "Software Engineering Opportunity")
        company = job.get("company_name", "Target Company")
        team = job.get("team") or "Engineering"
        deadline = job.get("deadline") or "Rolling / Not Specified"
        url = job.get("url") or "#"
        location = job.get("location") or "Multiple Locations"

        job_cards_html += f"""
        <div style="border: 1px solid #ede8de; border-radius: 10px; padding: 20px; margin: 14px 0; background-color: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #1a1a16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700;">
              {title}
            </h3>
          </div>
          <p style="margin: 4px 0 12px 0; font-size: 15px; color: #ad2831; font-weight: 600;">
            {company}
          </p>
          <div style="font-size: 13.5px; color: #55554b; line-height: 1.6; margin-bottom: 14px;">
            <div><strong>Location:</strong> {location}</div>
            <div><strong>Team:</strong> {team}</div>
            <div><strong>Deadline:</strong> {deadline}</div>
          </div>
          <a href="{url}" style="display: inline-block; background-color: #ad2831; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 13.5px; font-weight: 600;">
            View Official Posting &rarr;
          </a>
        </div>
        """

    count = len(postings)
    return f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a16;">
        <div style="max-width: 620px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; color: #ad2831; font-family: 'Newsreader', Georgia, serif; font-size: 32px; font-weight: 700;">Argus</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #77776d; text-transform: uppercase; letter-spacing: 1.5px;">Job Posting Monitor & Portfolio Matcher</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #ede8de; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px 0; color: #1a1a16; font-size: 20px;">
              New Relevant Openings Detected ({count})
            </h2>
            <p style="margin: 0; font-size: 14.5px; color: #55554b; line-height: 1.5;">
              The Argus monitor detected {count} new opening(s) matching your target preferences across official company ATS portals.
            </p>
          </div>

          <div style="margin-bottom: 24px;">
            {job_cards_html}
          </div>

          <div style="text-align: center; padding: 16px 0; font-size: 12.5px; color: #88887d;">
            <p style="margin: 0 0 4px 0;">Argus Automated Notification System &middot; Dispatched via Resend</p>
            <p style="margin: 0;">You are receiving this alert because you have active role filters configured.</p>
          </div>
        </div>
      </body>
    </html>
    """


def send_resend_digest(
    to_email: str,
    html_content: str,
    text_content: Optional[str] = None,
    subject: Optional[str] = None,
    api_key: Optional[str] = None,
    from_email: Optional[str] = None,
) -> Dict[str, Any]:
    """Dispatches an email via the Resend REST API (https://api.resend.com/emails).

    Args:
        to_email: Recipient email address.
        html_content: Rendered HTML body.
        text_content: Plain-text fallback body.
        subject: Email subject line.
        api_key: Optional Resend API key (defaults to RESEND_API_KEY env var).
        from_email: Optional sender address (defaults to RESEND_FROM_EMAIL env var).

    Returns:
        Dict with status ("ok" or "error"), resend_id, or error message.
    """
    import requests

    key = (api_key or os.getenv("RESEND_API_KEY", "")).strip()
    sender = (
        from_email
        or os.getenv("RESEND_FROM_EMAIL")
        or os.getenv("NOTIFICATION_EMAIL_FROM")
        or "Argus <onboarding@resend.dev>"
    )
    subj = subject or "Argus Alert: New Relevant Job Openings"

    if not key or key.startswith("re_your_"):
        logger.info(f"[Argus Resend Dev Mode] RESEND_API_KEY not configured. Mocking dispatch to {to_email}.")
        return {
            "status": "ok",
            "dev_mode": True,
            "message": f"Dev mode: Mock email dispatched to {to_email}.",
            "resend_id": "dev_mock_id",
        }

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {
        "from": sender,
        "to": [to_email],
        "subject": subj,
        "html": html_content,
    }
    if text_content:
        payload["text"] = text_content

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code in (200, 201):
            res_id = resp.json().get("id")
            return {"status": "ok", "resend_id": res_id}
        else:
            return {
                "status": "error",
                "message": f"Resend API returned {resp.status_code}: {resp.text}",
            }
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


def send_digest_notification(
    to_email: Optional[str] = None,
    posting_ids: Optional[List[int]] = None,
    db_manager: Optional[DatabaseManager] = None,
) -> Dict[str, Any]:
    """Compiles unnotified relevant postings and dispatches an email digest via Resend.

    Preserves zero-duplicate guarantee by atomically fetching and marking postings as
    notified in the database transaction.

    Args:
        to_email: Target recipient. Defaults to NOTIFICATION_EMAIL_TO env var.
        posting_ids: Optional specific posting IDs to include.
        db_manager: Optional DatabaseManager instance.

    Returns:
        Dict with status, dispatched count, and details.
    """
    db = db_manager or DatabaseManager()
    recipient = (
        to_email
        or os.getenv("NOTIFICATION_EMAIL_TO")
        or "candidate@example.com"
    )

    # 1. Fetch recipient preferences
    user_pref = {}
    if hasattr(db, "get_user_preferences") and recipient:
        try:
            user_pref = db.get_user_preferences(recipient)
        except Exception:
            pass
    if not user_pref and hasattr(db, "get_active_preferences"):
        try:
            user_pref = db.get_active_preferences()
        except Exception:
            pass

    # If email notifications explicitly disabled in user preferences, skip sending
    if user_pref and user_pref.get("email_notifications_enabled") is False:
        logger.info(f"Email alerts disabled for {recipient} in user preferences. Skipping notification.")
        return {
            "status": "ok",
            "message": "Email notifications are disabled in user preferences.",
            "count": 0,
            "notified_ids": [],
        }

    # 2. Fetch postings filtered by candidate preferences with atomic zero-duplicate claim
    claimed_atomically = False
    postings = []
    if hasattr(db, "claim_and_mark_unnotified_postings"):
        res = db.claim_and_mark_unnotified_postings(
            limit=100,
            preferences=user_pref if user_pref else None,
            posting_ids=posting_ids,
        )
        if isinstance(res, list):
            postings = res
            claimed_atomically = True

    if not claimed_atomically:
        if hasattr(db, "get_pending_notifications"):
            all_postings = db.get_pending_notifications(limit=100, preferences=user_pref if user_pref else None)
            if isinstance(all_postings, list):
                postings = [p for p in all_postings if p.get("id") in posting_ids] if posting_ids else all_postings
        elif hasattr(db, "get_unnotified_relevant_postings"):
            all_postings = db.get_unnotified_relevant_postings(limit=100, preferences=user_pref if user_pref else None)
            if isinstance(all_postings, list):
                postings = [p for p in all_postings if p.get("id") in posting_ids] if posting_ids else all_postings

    if not postings:
        return {
            "status": "ok",
            "message": "No new unnotified postings matching your preferences found.",
            "count": 0,
            "notified_ids": [],
        }

    ids_to_mark = [p["id"] for p in postings if p.get("id")]
    html_content = build_digest_html(postings)
    plain_text = f"Argus detected {len(postings)} new relevant job openings:\n\n" + "\n".join(
        f"- {p.get('title')} at {p.get('company_name')} ({p.get('url')})" for p in postings
    )
    subject = f"Argus Alert: {len(postings)} New Relevant Job Openings"

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = (
        os.getenv("RESEND_FROM_EMAIL")
        or os.getenv("NOTIFICATION_EMAIL_FROM")
        or "Argus <onboarding@resend.dev>"
    )

    # 3. Check if Resend API key is configured
    if api_key and not api_key.startswith("re_your_"):
        resend_result = send_resend_digest(
            to_email=recipient,
            html_content=html_content,
            text_content=plain_text,
            subject=subject,
            api_key=api_key,
            from_email=from_email,
        )
        if resend_result["status"] == "ok":
            res_id = resend_result.get("resend_id")
            logger.info(f"Dispatched Resend email digest to {recipient} (id: {res_id}) for postings {ids_to_mark}")
            if not claimed_atomically and hasattr(db, "mark_postings_notified"):
                db.mark_postings_notified(ids_to_mark)
            return {
                "status": "ok",
                "message": f"Successfully sent digest for {len(postings)} job(s) to {recipient}.",
                "count": len(postings),
                "resend_id": res_id,
                "notified_ids": ids_to_mark,
            }
        else:
            # Resend returned an error; rollback claimed status if needed
            logger.error(f"Resend dispatch failed: {resend_result.get('message')}")
            if claimed_atomically and hasattr(db, "unmark_postings_notified"):
                db.unmark_postings_notified(ids_to_mark)
            return {
                "status": "error",
                "message": resend_result.get("message", "Resend API error"),
                "count": len(postings),
                "notified_ids": [],
            }

    # 4. Dev mode / fallback when Resend is not configured with a live key
    logger.info(
        f"[Argus Resend Dev Mode] RESEND_API_KEY not configured. Digest generated for {len(postings)} job(s) for {recipient}."
    )
    if not claimed_atomically and hasattr(db, "mark_postings_notified"):
        db.mark_postings_notified(ids_to_mark)

    return {
        "status": "ok",
        "message": f"Dev mode: Processed digest for {len(postings)} job(s) for {recipient}.",
        "count": len(postings),
        "dev_mode": True,
        "notified_ids": ids_to_mark,
    }
