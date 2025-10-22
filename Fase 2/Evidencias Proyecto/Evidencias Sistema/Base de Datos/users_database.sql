-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.areas (
  area_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  area_name character varying NOT NULL UNIQUE,
  description character varying,
  CONSTRAINT areas_pkey PRIMARY KEY (area_id)
);
CREATE TABLE public.campus (
  campus_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  campus_name character varying NOT NULL,
  region character varying NOT NULL,
  address character varying NOT NULL,
  phone numeric NOT NULL,
  CONSTRAINT campus_pkey PRIMARY KEY (campus_id)
);
CREATE TABLE public.logs (
  log_id bigint NOT NULL DEFAULT nextval('logs_log_id_seq'::regclass),
  user_id uuid,
  action text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp without time zone DEFAULT now(),
  user_email text,
  user_full_name text,
  performed_by uuid,
  performed_by_email text,
  details jsonb,
  CONSTRAINT logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
);
CREATE TABLE public.user_profiles (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  names character varying NOT NULL,
  last_name_1 character varying NOT NULL,
  last_name_2 character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying NOT NULL DEFAULT 'viewer'::character varying,
  status character varying NOT NULL DEFAULT 'active'::character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  area_id smallint NOT NULL,
  campus_id smallint,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_profiles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(area_id),
  CONSTRAINT user_profiles_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES public.campus(campus_id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

--trigger para update_at
create or replace function update_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger trg_update_user_profiles
before update on public.user_profiles
for each row
execute procedure update_users_updated_at();
