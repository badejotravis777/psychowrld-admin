const mongoose = require("mongoose");

const customerServiceContactSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    number: { type: String, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerServiceContact", customerServiceContactSchema);