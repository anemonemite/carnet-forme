-- =====================================================================
-- Carnet Forme : tables, sécurité (RLS) et suppression de compte
-- À coller en une fois dans Supabase > SQL Editor > New query > Run.
-- Peut être relancé sans risque (tout est en « if not exists » / « or replace »).
-- =====================================================================

-- ---------- tables ----------
-- un jour = une ligne ; le contenu (repas, séances, créatine…) reste le JSON de l'app, dans « data »
create table if not exists public.days (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- un seul objet de réglages par compte (poids, g/kg, dose, objectif kcal, exercices perso…)
create table if not exists public.settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- sécurité : chaque compte ne voit et ne modifie que ses propres lignes ----------
alter table public.days     enable row level security;
alter table public.settings enable row level security;

drop policy if exists "days_select" on public.days;
drop policy if exists "days_insert" on public.days;
drop policy if exists "days_update" on public.days;
drop policy if exists "days_delete" on public.days;
create policy "days_select" on public.days for select to authenticated using ((select auth.uid()) = user_id);
create policy "days_insert" on public.days for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "days_update" on public.days for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "days_delete" on public.days for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_insert" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_delete" on public.settings;
create policy "settings_select" on public.settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings_insert" on public.settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings_update" on public.settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings_delete" on public.settings for delete to authenticated using ((select auth.uid()) = user_id);

-- accès via l'API : seulement pour les comptes connectés (les visiteurs anonymes n'ont rien)
revoke all on public.days, public.settings from anon;
grant select, insert, update, delete on public.days, public.settings to authenticated;

-- ---------- « la dernière écriture gagne » ----------
-- une modification faite hors ligne puis envoyée plus tard n'écrase pas une version plus récente
create or replace function public.keep_newest()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then
    return null; -- version plus ancienne : on ignore
  end if;
  return new;
end $$;

drop trigger if exists days_keep_newest on public.days;
create trigger days_keep_newest before update on public.days
  for each row execute function public.keep_newest();
drop trigger if exists settings_keep_newest on public.settings;
create trigger settings_keep_newest before update on public.settings
  for each row execute function public.keep_newest();

-- ---------- « Supprimer mon compte et mes données » ----------
-- supprime uniquement le compte de la personne connectée ; ses jours et réglages partent avec (on delete cascade)
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
