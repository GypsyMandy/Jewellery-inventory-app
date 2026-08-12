-- Run this in Supabase SQL Editor.
-- This creates the current jewelry inventory structure.

create extension if not exists "pgcrypto";

create table if not exists public.jewelry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_code text not null check (category_code in ('N','C','B','E','P','R','W')),
  inventory_number integer not null check (inventory_number > 0),
  inventory_code text not null,
  description text,
  designer text,
  status text default 'Needs photos',
  material text,
  stones text,
  length text,
  width text,
  weight_grams numeric,
  hallmarks text,
  notes text,
  price numeric,
  condition text,
  storage_location text,
  listing_platform text,
  listing_url text,
  listing_title text,
  listing_description text,
  keywords text,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, inventory_code)
);

alter table public.jewelry_items enable row level security;

create policy "Users can view own jewelry"
on public.jewelry_items for select
using (auth.uid() = user_id);

create policy "Users can insert own jewelry"
on public.jewelry_items for insert
with check (auth.uid() = user_id);

create policy "Users can update own jewelry"
on public.jewelry_items for update
using (auth.uid() = user_id);

create policy "Users can delete own jewelry"
on public.jewelry_items for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('jewelry-photos','jewelry-photos',true)
on conflict (id) do nothing;

create policy "Users upload own photos"
on storage.objects for insert to authenticated
with check (bucket_id='jewelry-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "Users update own photos"
on storage.objects for update to authenticated
using (bucket_id='jewelry-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "Users delete own photos"
on storage.objects for delete to authenticated
using (bucket_id='jewelry-photos' and (storage.foldername(name))[1]=auth.uid()::text);
