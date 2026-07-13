const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    categories: { type: [String], required: true, default: [] },
    subcategory: { type: String, default: "" },
    available: { type: Boolean, default: true },
    emoji: { type: String, default: "🛍️" },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    customAttributes: {
      type: [
        {
          name: { type: String, required: true },
          options: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    images: { type: [String], default: [] },        // multiple image URLs
    imagePublicIds: { type: [String], default: [] }, // multiple cloudinary IDs
    // Keep single for backward compat
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);