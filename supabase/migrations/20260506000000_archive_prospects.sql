-- Add archive tracking columns to prospects table
alter table prospects
  add column if not exists archived_prev_status text,
  add column if not exists archived_at date;
