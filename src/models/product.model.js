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
    categorySubcategories: {
      type: [
        {
          category: { type: String, required: true },
          subcategory: { type: String, default: "" },
        },
      ],
      default: [],
    },
    customAttributes: {
      type: [
        {
          name: { type: String, required: true },
          options: {
            type: [
              {
                value: { type: String, required: true },
                priceAdjustment: { type: Number, default: 0 },
              },
            ],
            default: [],
          },
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