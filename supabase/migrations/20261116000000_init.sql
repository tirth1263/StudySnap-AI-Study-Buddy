-- StudySnap database schema.
--
-- Security model in one sentence: every table has Row Level Security turned on
-- with "you can only see your own rows" policies, and anything that costs money
-- or grants privileges (creating decks, the usage log, the plan) can only be
-- written by the Edge Function, which uses the service role key.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds the plan (free / pro)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);
-- No insert/update policy on purpose: users must not be able to set plan = 'pro'.

-- Create the profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- decks: one per upload, holds the summary and the quiz
-- ---------------------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  summary text not null default '',
  key_points jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('pdf', 'image', 'text')),
  source_path text,
  created_at timestamptz not null default now()
);

create index decks_user_created_idx on public.decks (user_id, created_at desc);
alter table public.decks enable row level security;

create policy "Users can read their own decks"
  on public.decks for select
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own decks"
  on public.decks for delete
  using ((select auth.uid()) = user_id);
-- No insert policy: decks are created by the generate-deck Edge Function only,
-- so the weekly upload limit cannot be bypassed from the app.

-- ---------------------------------------------------------------------------
-- cards: flashcards, plus where each one is on the review schedule
-- ---------------------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  position int not null default 0,
  step int not null default 0 check (step >= 0),  -- times in a row the student knew it
  due_at timestamptz,                             -- null = never studied
  last_reviewed_at timestamptz
);

create index cards_deck_idx on public.cards (deck_id, position);
create index cards_user_due_idx on public.cards (user_id, due_at);
alter table public.cards enable row level security;

create policy "Users can read their own cards"
  on public.cards for select
  using ((select auth.uid()) = user_id);

create policy "Users can update their own cards"
  on public.cards for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The app may only change the schedule columns, never the card text or owner.
revoke update on public.cards from authenticated, anon;
grant update (step, due_at, last_reviewed_at) on public.cards to authenticated;

-- ---------------------------------------------------------------------------
-- reviews: every "knew it" / "didn't know" tap
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  knew_it boolean not null,
  reviewed_at timestamptz not null default now()
);

create index reviews_card_idx on public.reviews (card_id, reviewed_at desc);
alter table public.reviews enable row level security;

create policy "Users can read their own reviews"
  on public.reviews for select
  using ((select auth.uid()) = user_id);

create policy "Users can add reviews for their own cards"
  on public.reviews for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.cards c
      where c.id = card_id and c.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- uploads: usage log for the weekly limit (survives deck deletion)
-- ---------------------------------------------------------------------------
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index uploads_user_created_idx on public.uploads (user_id, created_at desc);
alter table public.uploads enable row level security;

create policy "Users can read their own upload history"
  on public.uploads for select
  using ((select auth.uid()) = user_id);
-- Written only by the Edge Function.

-- ---------------------------------------------------------------------------
-- Storage: a private "uploads" bucket; each user gets a folder named after their id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 10485760)
on conflict (id) do nothing;

create policy "Users can upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read their own uploads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
