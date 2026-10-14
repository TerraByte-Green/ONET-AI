-- O*NET database schema (built against O*NET 31.0, August 2026).
--
-- Normalized layout: reference tables (occupations, content model elements,
-- scales, categories) hold names and descriptions once; data tables store only
-- IDs and values. The repeated Title / Element Name / Scale Name columns from
-- the source spreadsheets are rebuilt by the v_* views in the next migration.
--
-- Table names follow the O*NET file names (https://www.onetcenter.org/dictionary/31.0/excel/).
-- "Date" columns (MM/YYYY in the source) are stored as the first day of that month.
-- Y/N flags are stored as booleans.
--
-- The schema is not exposed through the Supabase Data API; the application
-- connects directly with a Postgres connection string.

create schema if not exists onet;

comment on schema onet is 'O*NET occupational database (https://www.onetcenter.org). Licensed CC BY 4.0.';

-- Keep the schema private to direct database connections even if it is later
-- added to the Data API's exposed schemas by mistake.
revoke all on schema onet from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema onet from %I', r);
      execute format('alter default privileges in schema onet revoke all on tables from %I', r);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Release metadata
-- ---------------------------------------------------------------------------

create table onet.release_info (
  release      text primary key,              -- e.g. '31.0'
  release_name text,                          -- e.g. 'August 2026 Release'
  source_url   text,
  license      text,
  loaded_at    timestamptz not null default now()
);
comment on table onet.release_info is 'The O*NET release currently loaded. One row; replaced on every load.';

-- ---------------------------------------------------------------------------
-- Core reference tables
-- ---------------------------------------------------------------------------

create table onet.occupation_data (
  onetsoc_code text primary key check (onetsoc_code ~ '^\d{2}-\d{4}\.\d{2}$'),
  title        text not null,
  description  text not null
);
comment on table onet.occupation_data is 'Source: Occupation Data.xlsx';

create table onet.content_model_reference (
  element_id        text primary key,
  element_name      text not null,
  description       text,
  -- '1.A.1.a' -> '1.A.1'; null for top-level domains such as '1'.
  parent_element_id text generated always as (
                      nullif(regexp_replace(element_id, '\.[^.]+$', ''), element_id)
                    ) stored references onet.content_model_reference (element_id)
);
create index on onet.content_model_reference (parent_element_id);
comment on table onet.content_model_reference is 'Source: Content Model Reference.xlsx. Every element (abilities, skills, GWAs, IWAs, DWAs, etc.) lives here.';

create table onet.scales_reference (
  scale_id   text primary key,
  scale_name text not null,
  minimum    integer not null,
  maximum    integer not null
);
comment on table onet.scales_reference is 'Source: Scales Reference.xlsx';

create table onet.job_zone_reference (
  job_zone     smallint primary key,
  name         text not null,
  experience   text not null,
  education    text not null,
  job_training text not null,
  examples     text not null,
  svp_range    text not null
);
comment on table onet.job_zone_reference is 'Source: Job Zone Reference.xlsx. Job Zones 1 and 2 are combined under job_zone = 2.';

-- ---------------------------------------------------------------------------
-- Category / anchor reference tables
-- ---------------------------------------------------------------------------

create table onet.task_categories (
  scale_id             text not null references onet.scales_reference,
  category             smallint not null,
  category_description text not null,
  primary key (scale_id, category)
);
comment on table onet.task_categories is 'Source: Task Categories.xlsx';

create table onet.education_categories (
  element_id           text not null references onet.content_model_reference,
  scale_id             text not null references onet.scales_reference,
  category             smallint not null,
  category_description text not null,
  primary key (element_id, scale_id, category)
);
comment on table onet.education_categories is 'Source: Education Categories.xlsx';

create table onet.training_experience_categories (
  element_id           text not null references onet.content_model_reference,
  scale_id             text not null references onet.scales_reference,
  category             smallint not null,
  category_description text not null,
  primary key (element_id, scale_id, category)
);
comment on table onet.training_experience_categories is 'Source: Training and Experience Categories.xlsx';

create table onet.work_context_categories (
  element_id           text not null references onet.content_model_reference,
  scale_id             text not null references onet.scales_reference,
  category             smallint not null,
  category_description text not null,
  primary key (element_id, scale_id, category)
);
comment on table onet.work_context_categories is 'Source: Work Context Categories.xlsx';

create table onet.level_scale_anchors (
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  anchor_value       smallint not null,
  anchor_description text not null,
  primary key (element_id, scale_id, anchor_value)
);
comment on table onet.level_scale_anchors is 'Source: Level Scale Anchors.xlsx';

create table onet.survey_booklet_locations (
  survey_item_number text primary key,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference
);
create index on onet.survey_booklet_locations (element_id);
comment on table onet.survey_booklet_locations is 'Source: Survey Booklet Locations.xlsx';

-- ---------------------------------------------------------------------------
-- Work activity hierarchy: GWA -> IWA -> DWA
-- ---------------------------------------------------------------------------

create table onet.iwa_reference (
  iwa_id text primary key references onet.content_model_reference,
  gwa_id text not null references onet.content_model_reference
);
create index on onet.iwa_reference (gwa_id);
comment on table onet.iwa_reference is 'Source: GWAs to IWAs.xlsx. Names are in content_model_reference.';

create table onet.dwa_reference (
  dwa_id text primary key references onet.content_model_reference,
  iwa_id text not null references onet.iwa_reference
);
create index on onet.dwa_reference (iwa_id);
comment on table onet.dwa_reference is 'Source: GWAs to IWAs to DWAs.xlsx. Names are in content_model_reference.';

-- ---------------------------------------------------------------------------
-- Element-to-element crosswalks
-- ---------------------------------------------------------------------------

create table onet.element_crosswalk (
  crosswalk       text not null,  -- e.g. 'abilities_to_work_activities'
  from_element_id text not null references onet.content_model_reference,
  to_element_id   text not null references onet.content_model_reference,
  primary key (crosswalk, from_element_id, to_element_id)
);
create index on onet.element_crosswalk (to_element_id);
comment on table onet.element_crosswalk is
  'Sources: Abilities / Essential Skills / Transferable Skills / Work Styles to Work Activities and to Work Context, '
  'and Specific Interest Areas to Career Interest Types. One row per linked pair; crosswalk names the source file.';

-- ---------------------------------------------------------------------------
-- Interests reference
-- ---------------------------------------------------------------------------

create table onet.career_interest_type_keywords (
  element_id   text not null references onet.content_model_reference,
  keyword      text not null,
  keyword_type text not null,  -- 'Action' | 'Object'
  primary key (element_id, keyword)
);
comment on table onet.career_interest_type_keywords is 'Source: Career Interest Type Keywords.xlsx';

create table onet.interests_illustrative_activities (
  element_id    text not null references onet.content_model_reference,
  interest_type text not null,  -- 'Career Type' | 'Specific Area'
  activity      text not null,
  primary key (element_id, activity)
);
comment on table onet.interests_illustrative_activities is 'Source: Interests Illustrative Activities.xlsx';

create table onet.interests_illustrative_occupations (
  element_id    text not null references onet.content_model_reference,
  interest_type text not null,  -- 'Career Type' | 'Specific Area'
  onetsoc_code  text not null references onet.occupation_data,
  primary key (element_id, onetsoc_code)
);
create index on onet.interests_illustrative_occupations (onetsoc_code);
comment on table onet.interests_illustrative_occupations is 'Source: Interests Illustrative Occupations.xlsx';

-- ---------------------------------------------------------------------------
-- Occupation-level ratings with full survey statistics
-- ---------------------------------------------------------------------------

create table onet.abilities (
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.abilities (element_id, scale_id);
comment on table onet.abilities is 'Source: Abilities.xlsx';

create table onet.essential_skills (
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.essential_skills (element_id, scale_id);
comment on table onet.essential_skills is 'Source: Essential Skills.xlsx';

create table onet.transferable_skills (
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.transferable_skills (element_id, scale_id);
comment on table onet.transferable_skills is 'Source: Transferable Skills.xlsx';

create table onet.knowledge (
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.knowledge (element_id, scale_id);
comment on table onet.knowledge is 'Source: Knowledge.xlsx';

create table onet.work_activities (
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.work_activities (element_id, scale_id);
comment on table onet.work_activities is 'Source: Work Activities.xlsx';

-- Category is null for mean-score rows and set for per-category percentage rows,
-- so these tables use a surrogate key plus a NULLS NOT DISTINCT natural key.

create table onet.work_context (
  id                 bigint generated always as identity primary key,
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  category           smallint,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  not_relevant       boolean,
  date_updated       date not null,
  domain_source      text not null,
  unique nulls not distinct (onetsoc_code, element_id, scale_id, category),
  foreign key (element_id, scale_id, category) references onet.work_context_categories
);
create index on onet.work_context (element_id, scale_id);
comment on table onet.work_context is 'Source: Work Context.xlsx';

create table onet.education (
  id                 bigint generated always as identity primary key,
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  category           smallint,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  date_updated       date not null,
  domain_source      text not null,
  unique nulls not distinct (onetsoc_code, element_id, scale_id, category),
  foreign key (element_id, scale_id, category) references onet.education_categories
);
create index on onet.education (element_id, scale_id);
comment on table onet.education is 'Source: Education.xlsx';

create table onet.training_experience (
  id                 bigint generated always as identity primary key,
  onetsoc_code       text not null references onet.occupation_data,
  element_id         text not null references onet.content_model_reference,
  scale_id           text not null references onet.scales_reference,
  category           smallint,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  date_updated       date not null,
  domain_source      text not null,
  unique nulls not distinct (onetsoc_code, element_id, scale_id, category),
  foreign key (element_id, scale_id, category) references onet.training_experience_categories
);
create index on onet.training_experience (element_id, scale_id);
comment on table onet.training_experience is 'Source: Training and Experience.xlsx';

-- ---------------------------------------------------------------------------
-- Occupation-level ratings without survey statistics (AI/ML-derived scores)
-- ---------------------------------------------------------------------------

create table onet.career_interest_types (
  onetsoc_code  text not null references onet.occupation_data,
  element_id    text not null references onet.content_model_reference,
  scale_id      text not null references onet.scales_reference,
  data_value    numeric not null,
  date_updated  date not null,
  domain_source text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.career_interest_types (element_id, scale_id);
comment on table onet.career_interest_types is 'Source: Career Interest Types.xlsx (RIASEC)';

create table onet.specific_interest_areas (
  onetsoc_code  text not null references onet.occupation_data,
  element_id    text not null references onet.content_model_reference,
  scale_id      text not null references onet.scales_reference,
  data_value    numeric not null,
  date_updated  date not null,
  domain_source text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.specific_interest_areas (element_id, scale_id);
comment on table onet.specific_interest_areas is 'Source: Specific Interest Areas.xlsx';

create table onet.work_styles (
  onetsoc_code  text not null references onet.occupation_data,
  element_id    text not null references onet.content_model_reference,
  scale_id      text not null references onet.scales_reference,
  data_value    numeric not null,
  date_updated  date not null,
  domain_source text not null,
  primary key (onetsoc_code, element_id, scale_id)
);
create index on onet.work_styles (element_id, scale_id);
comment on table onet.work_styles is 'Source: Work Styles.xlsx';

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table onet.task_statements (
  task_id               integer primary key,
  onetsoc_code          text not null references onet.occupation_data,
  task                  text not null,
  task_type             text,     -- 'Core' | 'Supplemental'
  incumbents_responding integer,
  date_updated          date not null,
  domain_source         text not null,
  unique (onetsoc_code, task_id)
);
comment on table onet.task_statements is 'Source: Task Statements.xlsx';

create table onet.task_ratings (
  id                 bigint generated always as identity primary key,
  onetsoc_code       text not null,
  task_id            integer not null,
  scale_id           text not null references onet.scales_reference,
  category           smallint,
  data_value         numeric not null,
  n                  integer,
  standard_error     numeric,
  lower_ci_bound     numeric,
  upper_ci_bound     numeric,
  recommend_suppress boolean,
  date_updated       date not null,
  domain_source      text not null,
  unique nulls not distinct (task_id, scale_id, category),
  foreign key (onetsoc_code, task_id) references onet.task_statements (onetsoc_code, task_id),
  foreign key (scale_id, category) references onet.task_categories
);
create index on onet.task_ratings (onetsoc_code);
comment on table onet.task_ratings is 'Source: Task Ratings.xlsx';

create table onet.tasks_to_dwas (
  onetsoc_code  text not null,
  task_id       integer not null,
  dwa_id        text not null references onet.dwa_reference,
  date_updated  date not null,
  domain_source text not null,
  primary key (task_id, dwa_id),
  foreign key (onetsoc_code, task_id) references onet.task_statements (onetsoc_code, task_id)
);
create index on onet.tasks_to_dwas (dwa_id);
create index on onet.tasks_to_dwas (onetsoc_code);
comment on table onet.tasks_to_dwas is 'Source: Tasks to DWAs.xlsx';

create table onet.emerging_tasks (
  id               bigint generated always as identity primary key,
  onetsoc_code     text not null references onet.occupation_data,
  task             text not null,
  category         text not null check (category in ('New', 'Revision')),
  original_task_id integer,  -- set when category = 'Revision'
  date_updated     date not null,
  domain_source    text not null,
  unique (onetsoc_code, task),
  foreign key (onetsoc_code, original_task_id) references onet.task_statements (onetsoc_code, task_id)
);
comment on table onet.emerging_tasks is 'Source: Emerging Tasks.xlsx';

-- ---------------------------------------------------------------------------
-- Other occupation-level data
-- ---------------------------------------------------------------------------

create table onet.job_zones (
  onetsoc_code  text primary key references onet.occupation_data,
  job_zone      smallint not null references onet.job_zone_reference,
  date_updated  date not null,
  domain_source text not null
);
create index on onet.job_zones (job_zone);
comment on table onet.job_zones is 'Source: Job Zones.xlsx';

create table onet.job_titles (
  onetsoc_code text not null references onet.occupation_data,
  job_title    text not null,
  short_title  text,
  sources      text[] not null,  -- source codes, e.g. {01,02,08}
  primary key (onetsoc_code, job_title)
);
create index on onet.job_titles (lower(job_title));
comment on table onet.job_titles is 'Source: Job Titles.xlsx';

create table onet.sample_of_reported_titles (
  onetsoc_code          text not null references onet.occupation_data,
  reported_job_title    text not null,
  shown_in_my_next_move boolean not null,
  primary key (onetsoc_code, reported_job_title)
);
comment on table onet.sample_of_reported_titles is 'Source: Sample of Reported Titles.xlsx';

create table onet.related_occupations (
  onetsoc_code         text not null references onet.occupation_data,
  related_onetsoc_code text not null references onet.occupation_data,
  relatedness_tier     text not null,  -- 'Primary-Short' | 'Primary-Long' | 'Supplemental'
  related_index        smallint not null,
  primary key (onetsoc_code, related_onetsoc_code),
  unique (onetsoc_code, related_index)
);
create index on onet.related_occupations (related_onetsoc_code);
comment on table onet.related_occupations is 'Source: Related Occupations.xlsx';

create table onet.software_skills (
  onetsoc_code      text not null references onet.occupation_data,
  workplace_example text not null,
  element_id        text not null references onet.content_model_reference,
  hot_technology    boolean not null,
  in_demand         boolean not null,
  primary key (onetsoc_code, workplace_example)
);
create index on onet.software_skills (element_id);
create index on onet.software_skills (workplace_example);
comment on table onet.software_skills is 'Source: Software Skills.xlsx';

create table onet.occupation_level_metadata (
  id           bigint generated always as identity primary key,
  onetsoc_code text not null references onet.occupation_data,
  item         text not null,
  response     text,
  n            integer,
  percent      numeric,
  date_updated date not null,
  unique nulls not distinct (onetsoc_code, item, response)
);
comment on table onet.occupation_level_metadata is 'Source: Occupation Level Metadata.xlsx';
