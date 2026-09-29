create table if not exists yt_sync (
  id integer primary key,
  contract_address text not null default '',
  policy_cursor integer not null default 0,
  opportunity_cursor integer not null default 0,
  last_error text not null default '',
  updated_at timestamptz not null default now()
);

insert into yt_sync (id) values (1) on conflict (id) do nothing;

create table if not exists yt_sources (
  host text primary key,
  label text not null,
  enabled boolean not null,
  origin text not null
);

create table if not exists yt_policies (
  id integer primary key,
  name text not null,
  rules jsonb not null,
  creator text not null default '',
  created_at text not null,
  origin text not null
);

create table if not exists yt_opportunities (
  id integer primary key,
  protocol text not null,
  chain_name text not null,
  asset text not null,
  label text not null,
  advertised_apy text not null,
  canonical_url text not null,
  evidence_urls jsonb not null,
  pool_id text not null default '',
  submitter text not null default '',
  submitted_at text not null,
  origin text not null
);

create table if not exists yt_assessments (
  opportunity_id integer not null,
  revision integer not null,
  policy_id integer not null,
  assessed_at text not null,
  evidence_state text not null,
  primary_component text not null,
  components jsonb not null,
  risk_flags jsonb not null,
  confidence text not null,
  rationale text not null,
  sources_ok integer not null,
  sources_failed integer not null,
  decision text not null,
  reason_code text not null,
  origin text not null,
  primary key (opportunity_id, revision)
);

create table if not exists yt_activity (
  id serial primary key,
  kind text not null,
  summary text not null,
  ref_id text not null default '',
  origin text not null,
  created_at timestamptz not null default now()
);

create index if not exists yt_opp_origin_idx on yt_opportunities (origin);
create index if not exists yt_activity_created_idx on yt_activity (created_at desc);
