-- GuardAI Risk Register persistence draft
-- NOT an applied migration. Consolidate into generated GuardAI staging migrations.
-- Purpose: tenant-safe Risk objects linked to Targets, Findings and canonical Control IDs.
-- Product invariant: Finding != Risk. A Risk is an owned governance decision record.

begin;

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  treatment text not null default 'mitigate',
  likelihood smallint not null,
  impact smallint not null,
  residual_likelihood smallint,
  residual_impact smallint,
  owner_user_id uuid references auth.users(id),
  review_due_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint risks_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint risks_description_length check (description is null or char_length(description) <= 5000),
  constraint risks_status_allowed check (status in ('open','mitigating','accepted','closed')),
  constraint risks_treatment_allowed check (treatment in ('mitigate','accept','avoid','transfer','monitor')),
  constraint risks_likelihood_range check (likelihood between 1 and 5),
  constraint risks_impact_range check (impact between 1 and 5),
  constraint risks_residual_likelihood_range check (residual_likelihood is null or residual_likelihood between 1 and 5),
  constraint risks_residual_impact_range check (residual_impact is null or residual_impact between 1 and 5),
  constraint risks_residual_pair check (
    (residual_likelihood is null and residual_impact is null)
    or (residual_likelihood is not null and residual_impact is not null)
  ),
  constraint risks_accepted_treatment check (status <> 'accepted' or treatment = 'accept')
);

create table public.risk_targets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (risk_id, target_id),
  constraint risk_targets_risk_same_org
    foreign key (risk_id, organization_id)
    references public.risks(id, organization_id)
    on delete cascade,
  constraint risk_targets_target_same_org
    foreign key (target_id, organization_id)
    references public.targets(id, organization_id)
    on delete cascade
);

create table public.risk_findings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  finding_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (risk_id, finding_id),
  constraint risk_findings_risk_same_org
    foreign key (risk_id, organization_id)
    references public.risks(id, organization_id)
    on delete cascade,
  constraint risk_findings_finding_same_org
    foreign key (finding_id, organization_id)
    references public.findings(id, organization_id)
    on delete cascade
);

create table public.risk_controls (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  control_id text not null,
  created_at timestamptz not null default now(),
  primary key (risk_id, control_id),
  constraint risk_controls_risk_same_org
    foreign key (risk_id, organization_id)
    references public.risks(id, organization_id)
    on delete cascade,
  constraint risk_controls_control_id_format
    check (control_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$')
);

create index risks_org_status_updated_idx
on public.risks(organization_id, status, updated_at desc, id desc);

create index risks_org_review_due_idx
on public.risks(organization_id, review_due_at)
where review_due_at is not null and status <> 'closed';

create trigger risks_set_updated_at
before update on public.risks
for each row execute function private.set_updated_at();

revoke all on public.risks, public.risk_targets, public.risk_findings, public.risk_controls from anon;
revoke all on public.risks, public.risk_targets, public.risk_findings, public.risk_controls from authenticated;

grant select on public.risks, public.risk_targets, public.risk_findings, public.risk_controls to authenticated;

alter table public.risks enable row level security;
alter table public.risk_targets enable row level security;
alter table public.risk_findings enable row level security;
alter table public.risk_controls enable row level security;

create policy risks_select_member
on public.risks for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy risk_targets_select_member
on public.risk_targets for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy risk_findings_select_member
on public.risk_findings for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

create policy risk_controls_select_member
on public.risk_controls for select
to authenticated
using (private.has_org_role(organization_id, array['owner','admin','member','viewer']::public.guardai_org_role[]));

-- Mutations remain backend-first. The service layer validates:
-- - Organization RBAC,
-- - owner membership,
-- - canonical Control IDs,
-- - admin-only accepted-risk decisions,
-- - same-tenant Target/Finding relations.
-- Audit Events are written in the same backend transaction as Risk mutation.

commit;
