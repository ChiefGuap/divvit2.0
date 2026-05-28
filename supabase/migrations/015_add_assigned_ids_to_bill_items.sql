-- Migration 015: Add assigned_ids text column to bill_items for multi-person assignments in party mode
ALTER TABLE public.bill_items ADD COLUMN IF NOT EXISTS assigned_ids TEXT;
