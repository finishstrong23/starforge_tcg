/**
 * STARFORGE TCG - Payment Routes
 *
 * API endpoints for Stripe checkout, Apple IAP, and Google Play Billing.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as PaymentService from '../services/PaymentService';

const router = Router();

/** GET /api/payments/products — Get product catalog */
router.get('/products', (req: Request, res: Response) => {
  const { category, region } = req.query;
  const products = PaymentService.getProducts(
    category as string | undefined,
    region as string | undefined
  );
  res.json({ products });
});

/** GET /api/payments/products/:id — Get a specific product */
router.get('/products/:id', (req: Request, res: Response) => {
  const product = PaymentService.getProduct(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

/** POST /api/payments/stripe/checkout — Create Stripe checkout session */
router.post('/stripe/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, successUrl, cancelUrl } = req.body;
    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }

    const session = await PaymentService.createStripeCheckout(
      req.user!.userId,
      productId,
      successUrl || '/?payment=success',
      cancelUrl || '/?payment=cancelled',
    );
    res.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout';
    const status = message.includes('not found') || message.includes('only be purchased') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** POST /api/payments/stripe/webhook — Stripe webhook handler */
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    await PaymentService.handleStripeWebhook(type, data.object || data);
    res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    res.status(500).json({ error: message });
  }
});

/** POST /api/payments/apple/validate — Validate Apple IAP receipt */
router.post('/apple/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { receiptData, productId } = req.body;
    if (!receiptData || !productId) {
      res.status(400).json({ error: 'receiptData and productId are required' });
      return;
    }

    const result = await PaymentService.validateAppleReceipt(
      req.user!.userId,
      receiptData,
      productId,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Apple receipt validation failed';
    res.status(400).json({ error: message });
  }
});

/** POST /api/payments/google/validate — Validate Google Play purchase */
router.post('/google/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { purchaseToken, productId } = req.body;
    if (!purchaseToken || !productId) {
      res.status(400).json({ error: 'purchaseToken and productId are required' });
      return;
    }

    const result = await PaymentService.validateGooglePlayPurchase(
      req.user!.userId,
      purchaseToken,
      productId,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google Play validation failed';
    res.status(400).json({ error: message });
  }
});

/** GET /api/payments/history — Get purchase history */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const history = await PaymentService.getPurchaseHistory(req.user!.userId, limit);
    res.json({ purchases: history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

/** GET /api/payments/loot-box-disclosure — Loot box probability disclosure */
router.get('/loot-box-disclosure', (_req: Request, res: Response) => {
  res.json({ disclosure: PaymentService.getLootBoxDisclosure() });
});

export default router;
