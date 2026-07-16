const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const AgentSession = require("../models/agent-session.model");

const checkInternalSecret = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Bot pushes an incoming customer message here
router.post("/incoming", checkInternalSecret, async (req, res) => {
  try {
    const { customerNumber, text } = req.body;
    if (!customerNumber || !text) return res.status(400).json({ error: "customerNumber and text required" });

    let session = await AgentSession.findOne({ customerNumber });
    if (!session) {
      session = new AgentSession({ customerNumber, status: "waiting", messages: [] });
    }
    if (session.status === "ended") session.status = "waiting";

    session.messages.push({ from: "customer", text, timestamp: new Date() });
    await session.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard — list all sessions that aren't ended
router.get("/", auth, async (req, res) => {
  try {
    const sessions = await AgentSession.find({ status: { $ne: "ended" } }).sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard — agent sends a reply; forward it to the bot to actually deliver on WhatsApp
router.post("/:customerNumber/reply", auth, async (req, res) => {
  try {
    const { customerNumber } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    let session = await AgentSession.findOne({ customerNumber });
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "active";
    session.messages.push({ from: "agent", text, timestamp: new Date() });
    await session.save();

    await axios.post(
      `${process.env.BOT_URL}/api/agent/send`,
      { customerNumber, text },
      { headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Reply forward error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard — end the session, release the customer back to the bot menu
router.post("/:customerNumber/end", auth, async (req, res) => {
  try {
    const { customerNumber } = req.params;
    let session = await AgentSession.findOne({ customerNumber });
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "ended";
    await session.save();

    await axios.post(
      `${process.env.BOT_URL}/api/agent/end`,
      { customerNumber },
      { headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("End session forward error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;