create table if not exists public.players (
  id text primary key,

  number integer null,

  name text not null,
  ruby text not null,
  nickname text not null,
  appeared_works text not null,
  description text not null,

  get_methods jsonb not null default '[]'::jsonb,

  img_url text not null,
  view_url text not null,

  position text null,
  element text null,

  kick integer null,
  control integer null,
  technique integer null,
  pressure integer null,
  physical integer null,
  agility integer null,
  intelligence integer null,

  age_group text not null,
  grade text not null,
  gender text not null,

  category text[] not null default '{}'::text[],
  affiliation text[] not null default '{}'::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ありがちな検索用（必要なぶんだけでOK）
create index if not exists players_number_idx on public.players (number);
create index if not exists players_name_idx on public.players (name);
create index if not exists players_ruby_idx on public.players (ruby);
create index if not exists players_appeared_works_idx on public.players (appeared_works);
create index if not exists players_position_idx on public.players (position);
create index if not exists players_element_idx on public.players (element);

-- 配列検索（category @> ARRAY[...] みたいなのを速くする）
create index if not exists players_category_gin on public.players using gin (category);
create index if not exists players_affiliation_gin on public.players using gin (affiliation);

-- jsonb検索（将来get_methodsを検索したくなったら効く）
create index if not exists players_get_methods_gin on public.players using gin (get_methods);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();
