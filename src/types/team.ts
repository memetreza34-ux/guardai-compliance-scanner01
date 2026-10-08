import type { OrganizationRole } from './workspace';

export interface TeamMember {
  userId: string;
  role: OrganizationRole;
  displayName: string | null;
  joinedAt: string;
}
export interface TeamInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}
export interface CreatedTeamInvitation {
  invitation: TeamInvitation;
  token: string; // one-time secret; never log or persist
}
export interface AcceptedTeamInvitation {
  organizationId: string;
  role: OrganizationRole;
}
