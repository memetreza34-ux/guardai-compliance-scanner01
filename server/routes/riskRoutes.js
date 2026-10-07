const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const paramsSchema = z.object({ organizationId: z.string().uuid() });
const riskParamsSchema = z.object({
  organizationId: z.string().uuid(),
  riskId: z.string().uuid(),
});
const relationIds = z.array(z.string().uuid()).max(100).default([]);
const nullableScore = z.number().int().min(1).max(5).nullable().optional();
const reviewDate = z.string().max(50).nullable().optional();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(['open','mitigating','accepted','closed']).default('open'),
  treatment: z.enum(['mitigate','accept','avoid','transfer','monitor']).default('mitigate'),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  residualLikelihood: nullableScore,
  residualImpact: nullableScore,
  ownerUserId: z.string().uuid().nullable().optional(),
  reviewDueAt: reviewDate,
  targetIds: relationIds,
  findingIds: relationIds,
  controlIds: z.array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/)).max(100).default([]),
}).strict();

const updateSchema = createSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one Risk field is required.' },
);

router.get('/organizations/:organizationId/risks', requireAuth, async (req, res) => {
  try {
    const params = paramsSchema.parse(req.params);
    const { riskService } = getPersistenceServices();
    res.json({ risks: await riskService.list({ organizationId: params.organizationId, userId: req.auth.userId }) });
  } catch (error) {
    sendRouteError(res, error, 'Risk List');
  }
});

router.post('/organizations/:organizationId/risks', requireAuth, async (req, res) => {
  try {
    const params = paramsSchema.parse(req.params);
    const input = createSchema.parse(req.body);
    const { riskService } = getPersistenceServices();
    const risk = await riskService.create({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      input,
    });
    res.status(201).json({ risk });
  } catch (error) {
    sendRouteError(res, error, 'Risk Create');
  }
});

router.get('/organizations/:organizationId/risks/:riskId', requireAuth, async (req, res) => {
  try {
    const params = riskParamsSchema.parse(req.params);
    const { riskService } = getPersistenceServices();
    res.json({
      risk: await riskService.get({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        riskId: params.riskId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Risk Read');
  }
});

router.patch('/organizations/:organizationId/risks/:riskId', requireAuth, async (req, res) => {
  try {
    const params = riskParamsSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const { riskService } = getPersistenceServices();
    res.json({
      risk: await riskService.update({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        riskId: params.riskId,
        patch,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Risk Update');
  }
});

module.exports = { riskRoutes: router };
