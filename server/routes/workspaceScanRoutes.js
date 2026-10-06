const express = require('express');
const { z } = require('zod');
const scanContract = require('../../shared/scan-contract.json');
const { requireAuth } = require('../auth/supabaseAuth');
const { HttpError } = require('../lib/httpError');
const {
  finalizePersistentStatus,
  finalizePersistentSubmission,
} = require('../lib/persistentScanContract');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});

const submissionParamsSchema = organizationParamsSchema.extend({
  targetId: z.string().uuid(),
});

const scanParamsSchema = organizationParamsSchema.extend({
  scanId: z.string().uuid(),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const bodySchema = z.object({
  modules: z.array(z.string()).min(1).max(6),
});

router.post(
  '/organizations/:organizationId/targets/:targetId/scans',
  requireAuth,
  async (req, res) => {
    try {
      const params = submissionParamsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      const idempotencyHeader = req.get('Idempotency-Key');
      const { scanSubmission } = getPersistenceServices();

      const result = await scanSubmission.submit({
        organizationId: params.organizationId,
        targetId: params.targetId,
        requestedBy: req.auth.userId,
        requestedModules: body.modules,
        idempotencyKey: idempotencyHeader || null,
      });

      const payload = finalizePersistentSubmission({
        scan: result.scan,
        jobs: result.jobs,
        idempotentReplay: !result.created,
      });
      res.status(result.created ? 202 : 200).json(payload);
    } catch (error) {
      sendRouteError(res, error, 'Workspace Scan Submission');
    }
  },
);

router.get(
  '/organizations/:organizationId/scans',
  requireAuth,
  async (req, res) => {
    try {
      const params = organizationParamsSchema.parse(req.params);
      const query = listQuerySchema.parse(req.query);
      const {
        organizationAuthorization,
        scanReadRepository,
      } = getPersistenceServices();

      await organizationAuthorization.requireRole(
        params.organizationId,
        req.auth.userId,
        'viewer',
      );

      const scans = await scanReadRepository.listScans(
        params.organizationId,
        { limit: query.limit },
      );

      res.json({
        contractVersion: scanContract.version,
        scans,
      });
    } catch (error) {
      sendRouteError(res, error, 'Workspace Scan List');
    }
  },
);

router.get(
  '/organizations/:organizationId/scans/:scanId',
  requireAuth,
  async (req, res) => {
    try {
      const params = scanParamsSchema.parse(req.params);
      const {
        organizationAuthorization,
        scanReadRepository,
      } = getPersistenceServices();

      await organizationAuthorization.requireRole(
        params.organizationId,
        req.auth.userId,
        'viewer',
      );

      const result = await scanReadRepository.getScanWithJobs(
        params.organizationId,
        params.scanId,
      );

      if (!result) {
        throw new HttpError(404, 'Scan was not found in this organization.', 'SCAN_NOT_FOUND');
      }

      res.json(finalizePersistentStatus(result));
    } catch (error) {
      sendRouteError(res, error, 'Workspace Scan Status');
    }
  },
);

module.exports = { workspaceScanRoutes: router };
