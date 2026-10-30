-- =====================================================================
-- NYC Caption Club — Week 7 tables (prompt chains, LLMs, observability)
-- Run once in Supabase → SQL Editor. Safe to run again.
-- =====================================================================

-- ---------- LLM providers & models ----------
create table if not exists llm_providers (
  id bigint generated always as identity primary key,
  name text not null unique,
  website text,
  created_at timestamptz not null default now()
);

create table if not exists llm_models (
  id bigint generated always as identity primary key,
  name text not null,
  provider_model_id text not null,           -- the id you send to the API, e.g. gemini-3.5-flash
  llm_provider_id bigint not null references llm_providers on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Prompt chains ("humor flavors") ----------
create table if not exists humor_flavors (
  id bigint generated always as identity primary key,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists humor_flavor_steps (
  id bigint generated always as identity primary key,
  humor_flavor_id bigint not null references humor_flavors on delete cascade,
  order_by int not null default 1,
  llm_model_id bigint references llm_models on delete set null,
  temperature numeric not null default 1,
  system_prompt text not null,
  user_prompt text not null,
  description text,
  created_at timestamptz not null default now()
);

-- How many captions each prompt chain contributes per photo
create table if not exists humor_flavor_mix (
  id bigint generated always as identity primary key,
  humor_flavor_id bigint not null unique references humor_flavors on delete cascade,
  caption_count int not null default 3 check (caption_count between 0 and 10),
  updated_at timestamptz not null default now()
);

-- ---------- Prompt ingredients ----------
create table if not exists terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  definition text not null,
  example text,
  priority int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists caption_examples (
  id bigint generated always as identity primary key,
  image_description text not null,
  caption text not null,
  explanation text,
  priority int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Images, requests, responses ----------
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  profile_id uuid references auth.users on delete set null default auth.uid(),
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists caption_requests (
  id bigint generated always as identity primary key,
  profile_id uuid references auth.users on delete set null default auth.uid(),
  image_id uuid references images on delete set null,
  humor_flavor_id bigint references humor_flavors on delete set null,
  theme text,
  status text not null default 'pending',     -- pending | success | error
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists llm_model_responses (
  id bigint generated always as identity primary key,
  caption_request_id bigint references caption_requests on delete cascade,
  profile_id uuid references auth.users on delete set null default auth.uid(),
  llm_model_id bigint references llm_models on delete set null,
  model_name text,
  humor_flavor_step_id bigint references humor_flavor_steps on delete set null,
  system_prompt text,
  user_prompt text,
  response text,
  status text not null default 'success',
  processing_time_ms int,
  created_at timestamptz not null default now()
);

-- ---------- Sign-up controls ----------
create table if not exists allowed_signup_domains (
  id bigint generated always as identity primary key,
  apex_domain text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists whitelist_email_addresses (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security: admins can do everything; regular users get the
-- smallest access the caption app needs.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'llm_providers','llm_models','humor_flavors','humor_flavor_steps','humor_flavor_mix',
    'terms','caption_examples','images','caption_requests','llm_model_responses',
    'allowed_signup_domains','whitelist_email_addresses'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Admins manage" on %I', t);
    execute format(
      'create policy "Admins manage" on %I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t);
  end loop;

  -- The caption app reads the prompt chain to build its prompt
  foreach t in array array[
    'llm_providers','llm_models','humor_flavors','humor_flavor_steps','humor_flavor_mix','terms','caption_examples'
  ] loop
    execute format('drop policy if exists "Signed-in users read" on %I', t);
    execute format('create policy "Signed-in users read" on %I for select to authenticated using (true)', t);
  end loop;
end $$;

-- The caption app logs its own work (users can't read anyone else's logs)
drop policy if exists "Users add own images" on images;
create policy "Users add own images" on images for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "Users read own images" on images;
create policy "Users read own images" on images for select to authenticated using (profile_id = auth.uid());
-- The feed only shows photos an admin hasn't hidden
drop policy if exists "Anyone reads public images" on images;
create policy "Anyone reads public images" on images for select using (is_public);

drop policy if exists "Users add own requests" on caption_requests;
create policy "Users add own requests" on caption_requests for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "Users read own requests" on caption_requests;
create policy "Users read own requests" on caption_requests for select to authenticated using (profile_id = auth.uid());
drop policy if exists "Users update own requests" on caption_requests;
create policy "Users update own requests" on caption_requests for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Users add own responses" on llm_model_responses;
create policy "Users add own responses" on llm_model_responses for insert to authenticated with check (profile_id = auth.uid());

-- Admins can delete uploaded photos from storage
drop policy if exists "Admins delete uploads" on storage.objects;
create policy "Admins delete uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.is_superadmin());

-- =====================================================================
-- Starter data
-- =====================================================================
insert into llm_providers (name, website) values ('Google', 'https://ai.google.dev')
on conflict (name) do nothing;

insert into llm_models (name, provider_model_id, llm_provider_id, is_active)
select v.name, v.mid, p.id, v.active
from (values ('Gemini 3.5 Flash Lite', 'gemini-3.5-flash-lite', true),
             ('Gemini 3.5 Flash', 'gemini-3.5-flash', false)) as v(name, mid, active)
cross join llm_providers p
where p.name = 'Google'
  and not exists (select 1 from llm_models m where m.provider_model_id = v.mid);

insert into humor_flavors (slug, description) values
  ('midwest-transplant', 'Chronically online Columbia junior from the Midwest, new to NYC (our persona, Sam).')
on conflict (slug) do nothing;

insert into humor_flavor_steps (humor_flavor_id, order_by, llm_model_id, temperature, system_prompt, user_prompt, description)
select f.id, 1, (select id from llm_models where provider_model_id = 'gemini-3.5-flash-lite' limit 1), 1,
'You write captions for "NYC Caption Club." You speak like a chronically online Columbia junior who grew up in the Midwest and just moved to New York City. Use clever Gen Z internet humor. Be funny, not mean, and nothing offensive.',
'Today''s theme is "{theme}". Look at the photo and write {count} short, funny captions (max 15 words each). Connect them to the theme if you can.

Slang you can use:
{terms}

Captions people loved:
{examples}

Return ONLY a JSON array of {count} strings.',
'Single-step chain: photo → 3 captions'
from humor_flavors f
where f.slug = 'midwest-transplant'
  and not exists (select 1 from humor_flavor_steps s where s.humor_flavor_id = f.id);

insert into humor_flavor_mix (humor_flavor_id, caption_count)
select id, 3 from humor_flavors where slug = 'midwest-transplant'
on conflict (humor_flavor_id) do nothing;

insert into terms (term, definition, example, priority) values
  ('Ope', 'Midwestern sound made when bumping into someone or something', 'Ope, just gonna squeeze past this skyline real quick', 3),
  ('Bodega', 'NYC corner store, usually with a resident cat', 'The bodega cat has seen more of my 2am choices than my RA', 3),
  ('Lit Hum', 'Columbia''s Literature Humanities Core class', 'Late to Lit Hum because the 1 train had a plot twist', 2),
  ('Main character energy', 'Acting like you''re the star of a movie', 'Walking down Broadway with main character energy and a $9 latte', 1)
on conflict (term) do nothing;

insert into caption_examples (image_description, caption, explanation, priority)
select * from (values
  ('Pink sunset over a busy street with One World Trade Center in the distance',
   'Mom come pick me up, the sky in Morningside Heights is doing too much today.',
   'Midwest "call mom" bit + exaggerated reaction to NYC', 2),
  ('Same sunset street with a crosswalk',
   'Ope, just gonna squeeze past this skyline real quick to make my 8 AM Lit Hum.',
   'Uses Midwest slang and a Columbia-specific detail', 1)
) v(a, b, c, d)
where not exists (select 1 from caption_examples);

insert into allowed_signup_domains (apex_domain) values ('columbia.edu'), ('barnard.edu')
on conflict (apex_domain) do nothing;

-- Backfill: one row in images for every photo already in captions
insert into images (url, profile_id, description)
select distinct on (image_url) image_url, user_id, theme
from captions
order by image_url, created_at
on conflict (url) do nothing;
