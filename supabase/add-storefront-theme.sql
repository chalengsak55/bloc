-- Migration: Add storefront_theme column to profiles
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS storefront_theme text NOT NULL DEFAULT 'warm_cozy';
