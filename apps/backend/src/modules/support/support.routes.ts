import { Router } from 'express';
import { Restaurant, SupportTicket, User } from '../../models/index.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { requireFeature } from '../../utils/features.js';
import { asyncHandler, ok } from '../../utils/http.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant, requireFeature('support_chat'));

// Tickets raised by the current restaurant.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tickets = await SupportTicket.find({ restaurantId: req.branchId })
      .sort({ updatedAt: -1 })
      .lean();
    return ok(res, tickets);
  }),
);

// Raise a new support ticket.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { subject, message, category, priority } = req.body as Record<string, string>;
    if (!subject?.trim() || !message?.trim()) {
      throw ApiError.badRequest('Subject and message are required');
    }
    const [restaurant, author] = await Promise.all([
      Restaurant.findById(req.branchId).select('name').lean(),
      User.findById(req.auth!.sub).select('name email').lean(),
    ]);
    const ticket = await SupportTicket.create({
      restaurantId: req.branchId,
      restaurantName: restaurant?.name,
      subject: subject.trim(),
      message: message.trim(),
      category: category ?? 'other',
      priority: priority ?? 'normal',
      createdByName: author?.name,
      createdByEmail: author?.email,
    });
    return ok(res, ticket, 201);
  }),
);

// Reply to one of your own tickets.
router.post(
  '/:id/reply',
  asyncHandler(async (req, res) => {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) throw ApiError.badRequest('Message is required');
    const author = await User.findById(req.auth!.sub).select('name').lean();
    const ticket = await SupportTicket.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.branchId },
      {
        $push: { replies: { author: 'restaurant', authorName: author?.name, message: message.trim() } },
        status: 'open',
      },
      { new: true },
    );
    if (!ticket) throw ApiError.notFound('Ticket not found');
    return ok(res, ticket);
  }),
);

export default router;
