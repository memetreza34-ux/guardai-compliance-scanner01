import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type { TeamMember, TeamInvitation, CreatedTeamInvitation, AcceptedTeamInvitation } from '../types/team';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GuardApiError('Invalid Team API response.', 'INVALID_API_RESPONSE', 200);
  }
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new GuardApiError('Invalid Team API list.', 'INVALID_API_RESPONSE', 200);
  return value;
}

export function createTeamApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listMembers(organizationId: string): Promise<TeamMember[]> {
    const payload = record(await client.request(`/organizations/${encodeURIComponent(organizationId)}/team/members`));
    return array(payload.members) as TeamMember[];
  }
  async function listInvitations(organizationId: string): Promise<TeamInvitation[]> {
    const payload = record(await client.request(`/organizations/${encodeURIComponent(organizationId)}/team/invitations`));
    return array(payload.invitations) as TeamInvitation[];
  }
  async function createInvitation(organizationId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<CreatedTeamInvitation> {
    const payload = record(await client.request(`/organizations/${encodeURIComponent(organizationId)}/team/invitations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    }));
    if (typeof payload.token !== 'string') throw new GuardApiError('Invitation token was not returned.', 'INVALID_API_RESPONSE', 200);
    return { token: payload.token, invitation: record(payload.invitation) as unknown as TeamInvitation };
  }
  async function revokeInvitation(organizationId: string, invitationId: string): Promise<TeamInvitation> {
    const payload = record(await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/team/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: 'POST' },
    ));
    return record(payload.invitation) as unknown as TeamInvitation;
  }
  async function acceptInvitation(token: string): Promise<AcceptedTeamInvitation> {
    const payload = record(await client.request('/team-invitations/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }));
    return record(payload.accepted) as unknown as AcceptedTeamInvitation;
  }
  async function updateMember(organizationId: string, userId: string, role: 'admin' | 'member' | 'viewer') {
    const payload = record(await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/team/members/${encodeURIComponent(userId)}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) },
    ));
    return record(payload.member) as unknown as Pick<TeamMember, 'userId' | 'role'>;
  }
  async function removeMember(organizationId: string, userId: string) {
    await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/team/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  }
  return { listMembers, listInvitations, createInvitation, revokeInvitation, acceptInvitation,
    updateMember, removeMember };
}
