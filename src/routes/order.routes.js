const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Order = require("../models/order.model");
const Agent = require("../models/agent.model");

// Get all orders
router.get("/", auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get order stats
router.get("/stats", auth, async (req, res) => {
  try {
    const total = await Order.countDocuments();
    const pending = await Order.countDocuments({ status: "pending" });
    const confirmed = await Order.countDocuments({ status: "confirmed" });
    const paid = await Order.countDocuments({ status: "paid" });
    const preparing = await Order.countDocuments({ status: "preparing" });
    const out_for_delivery = await Order.countDocuments({ status: "out_for_delivery" });
    const delivered = await Order.countDocuments({ status: "delivered" });
    const cancelled = await Order.countDocuments({ status: "cancelled" });

    const revenue = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    res.json({
      total, pending, confirmed, paid, preparing,
      out_for_delivery, delivered, cancelled,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.patch("/:orderId/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign agent to order
router.patch("/:orderId/assign", auth, async (req, res) => {
  try {
    const { agentId } = req.body;
    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { assignedAgent: agent.name },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    agent.assignedOrders += 1;
    await agent.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
