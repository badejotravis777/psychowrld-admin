const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: String, enum: ["customer", "agent"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const agentSessionSchema = new mongoose.Schema(
  {
    customerNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["waiting", "active", "ended"], default: "waiting" },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AgentSession", agentSessionSchema);