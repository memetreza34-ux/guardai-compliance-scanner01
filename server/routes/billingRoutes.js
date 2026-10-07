const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { HttpError } = require('../lib/httpError');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});
const checkoutBodySchema = z.object({
  plan: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/),
});

function normalizeBillingStorageError(error) {
  if (error?.code === '42P01' || error?.code === '42703') {
    return new HttpError(
      503,
      'Billing storage is not fully provisioned in this GuardAI environment.',
      'BILLING_STORAGE_NOT_READY',
    );
  }
  return error;
}

function sendBillingRouteError(res, error, label) {
  sendRouteError(res, normalizeBillingStorageError(error), label);
}

router.get('/organizations/:organizationId/billing', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { billingService } = getPersistenceServices();
    res.json({
      billing: await billingService.getStatus({
        organizationId: params.organizationId,
        userId: req.auth.userId,
      }),
    });
  } catch (error) {
    sendBillingRouteError(res, error, 'Billing Status');
  }
});

router.post('/organizations/:organizationId/billing/checkout-session', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = checkoutBodySchema.parse(req.body);
    const { billingService } = getPersistenceServices();
    const checkout = await billingService.createCheckout({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      email: req.auth.email,
      plan: body.plan,
      idempotencyKey: req.get('Idempotency-Key'),
    });
    res.status(checkout.idempotentReplay ? 200 : 201).json({ checkout });
  } catch (error) {
    sendBillingRouteError(res, error, 'Billing Checkout');
  }
});

async function stripeWebhookHandler(req, res) {
  try {
    const { billingService } = getPersistenceServices();
    const result = await billingService.processStripeWebhook({
      rawBody: req.body,
      signatureHeader: req.get('stripe-signature'),
    });
    res.json({ received: true, ...result });
  } catch (error) {
    sendBillingRouteError(res, error, 'Stripe Webhook');
  }
}

module.exports = {
  billingRoutes: router,
  stripeWebhookHandler,
  normalizeBillingStorageError,
};
