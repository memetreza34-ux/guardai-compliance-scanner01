const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const {
  getControl,
  getFramework,
  getGovernanceCatalogMetadata,
  listControls,
  listFrameworks,
} = require('../governance/controlFrameworkRegistry');
const { sendRouteError } = require('../middleware/errorHandler');

const router = express.Router();

const idSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/);
const frameworkParamsSchema = z.object({ frameworkId: idSchema });
const controlParamsSchema = z.object({ controlId: idSchema });

router.get('/governance', requireAuth, (_req, res) => {
  res.json(getGovernanceCatalogMetadata());
});

router.get('/governance/frameworks', requireAuth, (_req, res) => {
  res.json({ frameworks: listFrameworks() });
});

router.get('/governance/frameworks/:frameworkId', requireAuth, (req, res) => {
  try {
    const params = frameworkParamsSchema.parse(req.params);
    res.json({ framework: getFramework(params.frameworkId) });
  } catch (error) {
    sendRouteError(res, error, 'Framework Read');
  }
});

router.get('/governance/controls', requireAuth, (_req, res) => {
  res.json({ controls: listControls() });
});

router.get('/governance/controls/:controlId', requireAuth, (req, res) => {
  try {
    const params = controlParamsSchema.parse(req.params);
    res.json({ control: getControl(params.controlId) });
  } catch (error) {
    sendRouteError(res, error, 'Control Read');
  }
});

module.exports = { governanceRoutes: router };
