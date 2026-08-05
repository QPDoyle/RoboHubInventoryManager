-- Run this in the Supabase SQL editor to create the tables

create table if not exists items (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  category        text,
  total_quantity  integer not null default 1 check (total_quantity >= 0),
  available_quantity integer not null default 1 check (available_quantity >= 0),
  barcode         text unique,
  location        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists checkouts (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references items(id) on delete cascade,
  checked_out_by  text not null,
  quantity        integer not null default 1 check (quantity > 0),
  checked_out_at  timestamptz not null default now(),
  due_date        date,
  returned_at     timestamptz,
  notes           text
);

-- Auto-update updated_at on items
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Enable Row Level Security (open for now — lock down when you add auth)
alter table items enable row level security;
alter table checkouts enable row level security;

-- Temporary open policies — anyone can read/write (replace when auth is added)
create policy "public read items"  on items    for select using (true);
create policy "public write items" on items    for all    using (true);
create policy "public read checkouts"  on checkouts for select using (true);
create policy "public write checkouts" on checkouts for all    using (true);

-- Seed some example items (optional — delete if you want to start fresh)
insert into items (name, description, category, total_quantity, available_quantity, location) values
  ('Servo Motor (Standard)', 'Hitec HS-422 or similar', 'Electronics', 10, 10, 'Shelf A1'),
  ('Arduino Uno', 'Rev 3', 'Electronics', 6, 6, 'Shelf A2'),
  ('Jumper Wires (pack)', 'Assorted M-M, M-F, F-F', 'Electronics', 20, 20, 'Bin B1'),
  ('Lipo Battery 7.4V', '2200mAh', 'Electronics', 8, 8, 'Shelf A3'),
  ('Zip Ties (bag)', '100 count', 'Consumables', 15, 15, 'Bin C1'),
  ('Duct Tape', 'Roll', 'Consumables', 5, 5, 'Shelf B2'),
  ('Allen Key Set', '10-piece metric', 'Tools', 4, 4, 'Tool Wall'),
  ('Wire Stripper', NULL, 'Tools', 3, 3, 'Tool Wall');
