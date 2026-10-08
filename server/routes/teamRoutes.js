const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');
const { HttpError } = require('../lib/httpError');

const router = express.Router();
const organizationParams = z.object({ organizationId: z.string().uuid() });
const memberParams = organizationParams.extend({ userId: z.string().uuid() });
const inviteParams = organizationParams.extend({ invitationId: z.string().uuid() });
const invitationBody = z.object({
  email: z.string().min(3).max(254),
  role: z.enum(['admin', 'member', 'viewer']),
}).strict();
const roleBody = z.object({ role: z.enum(['admin', 'member', 'viewer']) }).strict();
const acceptBody = z.object({ token: z.string().min(1).max(200) }).strict();

function sendTeamError(res, error, context) {
  if (error?.code === '42P01' || error?.code === '42703') {
    sendRouteError(res, new HttpError(503, 'Team invitation storage is not provisioned.', 'TEAM_STORAGE_NOT_READY'), context);
    return;
  }
  sendRouteError(res, error, context);
}

router.get('/organizations/:organizationId/team/members', requireAuth, async (req, res) => {
  try {
    const { organizationId } = organizationParams.parse(req.params);
    res.json({ members: await getPersistenceServices().teamService.members({
      organizationId, actorId: req.auth.userId,
    }) });
  } catch (error) { sendTeamError(res, error, 'Team members'); }
});

router.get('/organizations/:organizationId/team/invitations', requireAuth, async (req, res) => {
  try {
    const { organizationId } = organizationParams.parse(req.params);
    res.json({ invitations: await getPersistenceServices().teamService.invitations({
      organizationId, actorId: req.auth.userId,
    }) });
  } catch (error) { sendTeamError(res, error, 'Team invitations'); }
});

router.post('/organizations/:organizationId/team/invitations', requireAuth, async (req, res) => {
  try {
    const { organizationId } = organizationParams.parse(req.params);
    const { email, role } = invitationBody.parse(req.body);
    const result = await getPersistenceServices().teamService.invite({
      organizationId, actorId: req.auth.userId, email, role,
    });
    res.set('Cache-Control', 'no-store');
    res.status(201).json(result);
  } catch (error) { sendTeamError(res, error, 'Team invite'); }
});

router.post('/team-invitations/accept', requireAuth, async (req, res) => {
  try {
    const { token } = acceptBody.parse(req.body);
    const accepted = await getPersistenceServices().teamService.accept({
      actorId: req.auth.userId, email: req.auth.email,
      emailVerified: req.auth.emailVerified === true, token,
    });
    res.set('Cache-Control', 'no-store');
    res.json({ accepted });
  } catch (error) { sendTeamError(res, error, 'Team accept'); }
});

router.post('/organizations/:organizationId/team/invitations/:invitationId/revoke', requireAuth, async (req, res) => {
  try {
    const { organizationId, invitationId } = inviteParams.parse(req.params);
    res.json({ invitation: await getPersistenceServices().teamService.revoke({
      organizationId, invitationId, actorId: req.auth.userId,
    }) });
  } catch (error) { sendTeamError(res, error, 'Team revoke'); }
});

router.patch('/organizations/:organizationId/team/members/:userId', requireAuth, async (req, res) => {
  try {
    const { organizationId, userId } = memberParams.parse(req.params);
    const { role } = roleBody.parse(req.body);
    res.json({ member: await getPersistenceServices().teamService.changeRole({
      organizationId, actorId: req.auth.userId, targetUserId: userId, role,
    }) });
  } catch (error) { sendTeamError(res, error, 'Team change role'); }
});

router.delete('/organizations/:organizationId/team/members/:userId', requireAuth, async (req, res) => {
  try {
    const { organizationId, userId } = memberParams.parse(req.params);
    res.json(await getPersistenceServices().teamService.remove({
      organizationId, actorId: req.auth.userId, targetUserId: userId,
    }));
  } catch (error) { sendTeamError(res, error, 'Team remove member'); }
});

module.exports = { teamRoutes: router };
