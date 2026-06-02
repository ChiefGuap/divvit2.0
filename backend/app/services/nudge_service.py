import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from supabase import create_client

logger = logging.getLogger(__name__)

# URL for Expo Push API
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _get_supabase_client():
    """Create a Supabase client using the service role key to bypass RLS."""
    try:
        url = os.environ.get("SUPABASE_URL", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "")
        # Prioritize SUPABASE_SERVICE_KEY to bypass RLS for background services
        key = os.environ.get("SUPABASE_SERVICE_KEY", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")

        if not url or not key:
            logger.error("Supabase credentials missing. Cannot initialize service role client.")
            return None

        return create_client(url, key)
    except Exception as e:
        logger.error(f"Failed to create Supabase service client: {e}")
        return None


async def send_expo_push_notifications(messages: List[Dict[str, Any]]) -> bool:
    """
    Send push notifications to Expo Push API.
    Each message in the list should follow the format:
    {
      "to": "ExponentPushToken[xxx]",
      "sound": "default",
      "title": "Title",
      "body": "Body",
      "data": {"key": "value"}
    }
    """
    if not messages:
        return True

    logger.info(f"Sending {len(messages)} push notifications to Expo...")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                }
            )
            response_json = response.json()
            if response.status_code == 200:
                logger.info("Expo push notifications sent successfully.")
                # We can log individual error responses if some tokens were invalid
                if "data" in response_json:
                    for idx, result in enumerate(response_json["data"]):
                        if result.get("status") == "error":
                            logger.error(
                                f"Failed to deliver notification to token {messages[idx]['to']}: "
                                f"{result.get('message')} - Details: {result.get('details')}"
                            )
                return True
            else:
                logger.error(f"Failed to send to Expo. Status: {response.status_code}, Response: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Exception while sending Expo push notifications: {e}")
        return False


async def process_nudges() -> Dict[str, Any]:
    """
    Query scheduled_nudges that are due ('pending' and scheduled_for <= NOW()).
    For each due nudge, find unpaid payment requests, get push tokens,
    send push notifications, and update nudge status.
    """
    client = _get_supabase_client()
    if not client:
        return {"error": "Supabase client initialization failed", "processed": 0, "sent": 0}

    now_iso = datetime.now(timezone.utc).isoformat()
    logger.info(f"Running nudge processor check at {now_iso}")

    try:
        # 1. Fetch pending nudges past their scheduled execution time, including bill info
        # Note: In postgrest, to fetch associated relation, we can use bills(*)
        # We do this securely via service role
        response = await asyncio.to_thread(
            lambda: client.table("scheduled_nudges")
            .select("*, bills(*)")
            .eq("status", "pending")
            .lte("scheduled_for", now_iso)
            .execute()
        )
        due_nudges = response.data
    except Exception as e:
        logger.error(f"Error fetching scheduled nudges: {e}")
        return {"error": f"Failed to fetch nudges: {e}", "processed": 0, "sent": 0}

    if not due_nudges:
        logger.info("No due payment nudges to process.")
        return {"processed": 0, "sent": 0}

    logger.info(f"Found {len(due_nudges)} due payment nudges to process.")
    processed_count = 0
    notifications_sent = 0

    for nudge in due_nudges:
        nudge_id = nudge["id"]
        bill_id = nudge["bill_id"]
        bill_data = nudge.get("bills") or {}
        bill_title = bill_data.get("title") or "the bill"

        logger.info(f"Processing nudge {nudge_id} for bill {bill_id} ({bill_title})")

        try:
            # 2. Query all payment requests for this bill that are unpaid (status = 'pending')
            pr_response = await asyncio.to_thread(
                lambda: client.table("payment_requests")
                .select("*")
                .eq("bill_id", bill_id)
                .eq("status", "pending")
                .execute()
            )
            unpaid_requests = pr_response.data
        except Exception as e:
            logger.error(f"Failed to fetch payment requests for bill {bill_id}: {e}")
            continue

        if not unpaid_requests:
            logger.info(f"All participants have paid for bill {bill_id}. Cancelling nudge.")
            try:
                await asyncio.to_thread(
                    lambda: client.table("scheduled_nudges")
                    .update({"status": "cancelled", "sent_at": now_iso})
                    .eq("id", nudge_id)
                    .execute()
                )
                processed_count += 1
            except Exception as e:
                logger.error(f"Failed to update nudge status to cancelled: {e}")
            continue

        # 3. Collect all user IDs involved to fetch their profiles and push tokens
        user_ids = []
        for req in unpaid_requests:
            if req.get("from_user_id"):
                user_ids.append(req["from_user_id"])
            if req.get("to_user_id"):
                user_ids.append(req["to_user_id"])

        user_ids = list(set(user_ids))
        profiles_dict = {}

        if user_ids:
            try:
                prof_response = await asyncio.to_thread(
                    lambda: client.table("profiles")
                    .select("id, first_name, username, expo_push_token")
                    .in_("id", user_ids)
                    .execute()
                )
                profiles_dict = {p["id"]: p for p in prof_response.data}
            except Exception as e:
                logger.error(f"Failed to fetch profiles for nudge {nudge_id}: {e}")
                continue

        # 4. Construct push messages for participants who haven't paid yet and have a valid push token
        push_messages = []
        for req in unpaid_requests:
            payer_id = req.get("from_user_id")
            payee_id = req.get("to_user_id")
            amount = float(req.get("amount") or 0.0)

            if not payer_id:
                # Payer is a guest/unregistered, cannot notify via push
                continue

            payer_profile = profiles_dict.get(payer_id)
            payee_profile = profiles_dict.get(payee_id)

            if not payer_profile:
                continue

            push_token = payer_profile.get("expo_push_token")
            if not push_token or not push_token.startswith("ExponentPushToken"):
                logger.warning(f"No valid Expo push token found for user {payer_id}. Skipping nudge notification.")
                continue

            payer_name = payer_profile.get("first_name") or payer_profile.get("username") or "there"
            payee_name = payee_profile.get("first_name") or payee_profile.get("username") or "your friend"

            # Construct message body
            body_text = f"Hey {payer_name}! Don't forget to pay {payee_name} ${amount:.2f} for {bill_title}."

            push_messages.append({
                "to": push_token,
                "sound": "default",
                "title": "Friendly reminder from Divvit 💸",
                "body": body_text,
                "data": {
                    "url": "/(tabs)/history",
                    "billId": bill_id,
                    "paymentRequestId": req["id"]
                }
            })

        # 5. Send push notifications
        if push_messages:
            success = await send_expo_push_notifications(push_messages)
            if success:
                notifications_sent += len(push_messages)
            else:
                logger.error(f"Failed to dispatch push messages for nudge {nudge_id}")

        # 6. Update nudge status to 'sent'
        try:
            await asyncio.to_thread(
                lambda: client.table("scheduled_nudges")
                .update({"status": "sent", "sent_at": now_iso})
                .eq("id", nudge_id)
                .execute()
            )
            processed_count += 1
            logger.info(f"Nudge {nudge_id} completed. Status marked as 'sent'.")
        except Exception as e:
            logger.error(f"Failed to update nudge status to sent: {e}")

    return {
        "processed": processed_count,
        "sent": notifications_sent
    }
