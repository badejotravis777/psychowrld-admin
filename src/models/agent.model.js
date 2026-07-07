const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    whatsappNumber: { type: String, required: true },
    role: { type: String, default: "agent", enum: ["agent", "senior_agent", "manager"] },
    active: { type: Boolean, default: true },
    assignedOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);
