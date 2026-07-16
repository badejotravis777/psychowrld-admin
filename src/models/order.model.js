const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  quantity: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    waNumber: { type: String, required: true },
    items: [orderItemSchema],
    subtotal: Number,
    deliveryFee: { type: Number, default: 0 },
    total: Number,
    deliveryAddress: { type: String, default: "" },
    customerName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    deliveryType: { type: String, default: "" },
    distanceKm: { type: Number, default: null },
    deliveryRegion: { type: String, default: "" },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "paid", "preparing", "out_for_delivery", "delivered", "cancelled"],
    },
    paymentRef: { type: String, default: "" },
    paymentStatus: { type: String, default: "unpaid", enum: ["unpaid", "paid", "failed"] },
    assignedAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
