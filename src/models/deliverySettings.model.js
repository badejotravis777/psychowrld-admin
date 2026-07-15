const mongoose = require("mongoose");

const internationalRegionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    countries: { type: [String], default: [] },
    fee: { type: Number, required: true },
  },
  { _id: false }
);

const deliverySettingsSchema = new mongoose.Schema(
  {
    storeAddress: { type: String, required: true },
    storeLat: { type: Number, default: null },
    storeLng: { type: Number, default: null },
    baseFee: { type: Number, default: 1000 },
    ratePerKm: { type: Number, default: 150 },
    minFee: { type: Number, default: 1500 },
    maxFee: { type: Number, default: 15000 },
    internationalRegions: { type: [internationalRegionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliverySettings", deliverySettingsSchema);