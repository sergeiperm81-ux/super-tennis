-- i18n Phase 1 migration — applied to Supabase project qpnxhiwauhuogwkspxuq
-- as `i18n_translation_tables` (2026-06-19). Recorded here for version control.
-- Additive only: zero changes to existing tables. See docs/I18N_PHASE1_DESIGN.md §1.

create table public.article_translations (
  id               bigint generated always as identity primary key,
  article_id       integer not null references public.articles(id) on delete cascade,
  lang             text    not null check (lang in ('es','fr','zh')),
  title            text,
  excerpt          text,
  body             text,
  meta_title       text,
  meta_description text,
  image_alt        text,
  status           text    not null default 'published' check (status in ('published','review','draft')),
  schema_version   integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (article_id, lang)
);

create table public.news_translations (
  id             bigint generated always as identity primary key,
  news_id        bigint  not null references public.news(id) on delete cascade,
  lang           text    not null check (lang in ('es','fr','zh')),
  title          text,
  summary        text,
  body           text,
  status         text    not null default 'published' check (status in ('published','review','draft')),
  schema_version integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (news_id, lang)
);

create table public.player_translations (
  id               bigint generated always as identity primary key,
  player_id        text    not null references public.players(player_id) on delete cascade,
  lang             text    not null check (lang in ('es','fr','zh')),
  bio_short        text,
  meta_title       text,
  meta_description text,
  status           text    not null default 'published' check (status in ('published','review','draft')),
  schema_version   integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (player_id, lang)
);

create table public.page_translations (
  id             bigint generated always as identity primary key,
  page_key       text    not null,
  lang           text    not null check (lang in ('es','fr','zh')),
  fields_json    jsonb   not null,
  status         text    not null default 'published' check (status in ('published','review','draft')),
  schema_version integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (page_key, lang)
);

create table public.translation_glossary (
  id          bigint generated always as identity primary key,
  lang        text not null check (lang in ('es','fr','zh')),
  source_term text not null,
  target_term text not null,
  kind        text not null check (kind in ('player_name','term','brand')),
  unique (lang, source_term, kind)
);

-- RLS on all. Content tables: public SELECT of published. Glossary: service-key-only (no public policy).
alter table public.article_translations enable row level security;
alter table public.news_translations    enable row level security;
alter table public.player_translations  enable row level security;
alter table public.page_translations    enable row level security;
alter table public.translation_glossary enable row level security;

create policy "Public read article_translations" on public.article_translations
  for select to public using (status = 'published');
create policy "Public read news_translations" on public.news_translations
  for select to public using (status = 'published');
create policy "Public read player_translations" on public.player_translations
  for select to public using (status = 'published');
create policy "Public read page_translations" on public.page_translations
  for select to public using (status = 'published');

create index article_translations_lang_idx on public.article_translations (lang);
create index news_translations_lang_idx    on public.news_translations (lang);
create index player_translations_lang_idx  on public.player_translations (lang);
create index page_translations_lang_idx    on public.page_translations (lang);
create index translation_glossary_lang_idx on public.translation_glossary (lang, kind);
