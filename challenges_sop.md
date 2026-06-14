# Standard Operating Procedure (SOP) — Challenge Management

This document provides instructions for non-technical team members to add, edit, or disable challenges using the **Supabase Dashboard**.

---

## 1. Adding a New Challenge

1. Open your **Supabase Dashboard** and go to **Table Editor** (grid icon in the left sidebar).
2. Select the `challenges` table.
3. Click the **Insert Row** button at the top right.
4. Fill in the following fields:
   * **`kind`**: Must be one of `daily`, `standard`, `group`, or `referral`.
   * **`title`**: The main name of the challenge (e.g. `Smash Burger Sunday`).
   * **`subtitle`**: Optional secondary headline (e.g. `Get their Pad-Thai menu item`).
   * **`description`**: Detailed instructions (e.g. `Scan any receipt from Habit Burger today to earn 25 bonus pts!`).
   * **`points`**: The number of points awarded to the user (e.g. `25`).
   * **`brand`**: Optional brand display string (e.g. `Habit Burger`).
   * **`required_merchant`**: The EXACT store name expected on the receipt (case-insensitive fuzzy matching is applied). Leave blank if merchant verification is not needed.
   * **`required_items`**: A JSON list of items that must appear on the receipt. Format: `["Pad Thai", "Pad-Thai"]`. Leave blank if item verification is not needed.
   * **`min_amount`**: Optional minimum receipt total spend (e.g. `10.00`).
   * **`starts_at`**: Date & time the challenge becomes active (e.g. `2026-06-13T19:00:00Z`).
   * **`ends_at`**: Date & time the challenge expires (e.g. `2026-06-14T19:00:00Z`).
   * **`is_active`**: Set to `true` to make it visible.
   * **`sort_order`**: Optional integer ordering (lower numbers appear first).
   * **`max_completions_per_user`**: How many times a single user can claim it (default: `1`).
5. **Upload an Image**:
   * Go to **Storage** in the left sidebar.
   * Click on the `challenge-images` bucket.
   * Upload your image file.
   * Click on the uploaded file and copy its **Public URL**.
   * Paste this URL into the **`image_url`** column of your new row in the Table Editor.
6. Click **Save** to publish.

---

## 2. Disabling or Removing a Challenge

* **To temporarily disable a challenge**: Find the row in the `challenges` table and set the **`is_active`** column to `false`. It will instantly disappear from all users' apps.
* **To delete a challenge**: Right-click the row in the `challenges` table and click **Delete Row**. Note that this will also delete completion history if users claimed it. It is recommended to set `is_active` to `false` instead to retain logs.
