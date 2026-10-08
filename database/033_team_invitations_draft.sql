-- GuardAI Team invitations — DRAFT ONLY, not an applied migration.
-- Run only after a dedicated GuardAI staging migration/security review.
-- Invitation tokens are never persisted in plaintext; email is used only to bind acceptance.
begin;

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_normalized text not null,
  invited_role public.guardai_org_role not null,
  token_hash char(64) not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invite_email check (
    char_length(email_normalized) between 3 and 254
    and email_normalized = lower(btrim(email_normalized))
  ),
  constraint team_invite_role check (invited_role <> 'owner'::public.guardai_org_role),
  constraint team_invite_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint team_invite_status check (status in ('pending','accepted','revoked')),
  constraint team_invite_state check (
    (status = 'pending' and accepted_at is null and accepted_by is null and revoked_at is null)
    or (status = 'accepted' and accepted_at is not null and accepted_by is not null and revoked_at is null)
    or (status = 'revoked' and accepted_at is null and accepted_by is null and revoked_at is not null)
  )
);

create unique index team_invite_one_pending_email
  on public.team_invitations(organization_id, email_normalized)
  where status = 'pending';
create index team_invite_org_created
  on public.team_invitations(organization_id, created_at desc);

create trigger team_invitations_set_updated_at
before update on public.team_invitations for each row
execute function private.set_updated_at();

alter table public.team_invitations enable row level security;
revoke all on public.team_invitations from anon;
revoke all on public.team_invitations from authenticated;

-- Invitation secrets, acceptance and Membership mutations are backend-only.
-- The API rechecks current roles inside the same transaction as each mutation.
commit;
