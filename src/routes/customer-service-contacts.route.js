const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CustomerServiceContact = require("../models/customer-service-contact.model");

// Get all contacts
router.get("/", auth, async (req, res) => {
  try {
    const contacts = await CustomerServiceContact.find().sort({ order: 1, createdAt: 1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contact
router.post("/", auth, async (req, res) => {
  try {
    const { label, number, order } = req.body;
    if (!label || !number) return res.status(400).json({ error: "label and number required" });
    const contact = new CustomerServiceContact({ label, number, order: order || 0 });
    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact
router.put("/:id", auth, async (req, res) => {
  try {
    const { label, number, order } = req.body;
    const contact = await CustomerServiceContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    contact.label = label ?? contact.label;
    contact.number = number ?? contact.number;
    contact.order = order ?? contact.order;
    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active
router.patch("/:id/toggle", auth, async (req, res) => {
  try {
    const contact = await CustomerServiceContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    contact.active = !contact.active;
    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact
router.delete("/:id", auth, async (req, res) => {
  try {
    await CustomerServiceContact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;