const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const DeliverySettings = require("../models/deliverySettings.model");

// Get settings (create default if none exist yet)
router.get("/", auth, async (req, res) => {
  try {
    let settings = await DeliverySettings.findOne();
    if (!settings) {
      settings = await DeliverySettings.create({
        storeAddress: "No 3 Nathan Street, Off Ojuelegba Road, Surulere, Lagos, Nigeria",
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.put("/", auth, async (req, res) => {
  try {
    const { storeAddress, baseFee, ratePerKm, minFee, maxFee, internationalRegions } = req.body;

    let settings = await DeliverySettings.findOne();
    if (!settings) settings = new DeliverySettings({ storeAddress });

    // If the store address changed, clear cached coordinates so the bot re-geocodes it next time
    if (storeAddress !== undefined && storeAddress !== settings.storeAddress) {
      settings.storeAddress = storeAddress;
      settings.storeLat = null;
      settings.storeLng = null;
    }

    if (baseFee !== undefined) settings.baseFee = Number(baseFee);
    if (ratePerKm !== undefined) settings.ratePerKm = Number(ratePerKm);
    if (minFee !== undefined) settings.minFee = Number(minFee);
    if (maxFee !== undefined) settings.maxFee = Number(maxFee);
    if (internationalRegions !== undefined) settings.internationalRegions = internationalRegions;

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;