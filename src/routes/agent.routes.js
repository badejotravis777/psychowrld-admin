const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Agent = require("../models/agent.model");

// Get all agents
router.get("/", auth, async (req, res) => {
  try {
    const agents = await Agent.find().sort({ name: 1 });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add agent
router.post("/", auth, async (req, res) => {
  try {
    const { name, whatsappNumber, role } = req.body;
    const agent = new Agent({ name, whatsappNumber, role });
    await agent.save();
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent
router.put("/:id", auth, async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle agent active status
router.patch("/:id/toggle", auth, async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    agent.active = !agent.active;
    await agent.save();
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete agent
router.delete("/:id", auth, async (req, res) => {
  try {
    await Agent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
