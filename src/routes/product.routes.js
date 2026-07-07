const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Product = require("../models/product.model");
const { upload, cloudinary } = require("../config/cloudinary");

// Get all products
router.get("/", auth, async (req, res) => {
  try {
    const { category, subcategory, available } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (available !== undefined) filter.available = available === "true";
    const products = await Product.find(filter).sort({ category: 1, subcategory: 1, name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all categories with subcategories
router.get("/categories", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    const result = {};
    for (const cat of categories) {
      result[cat] = await Product.distinct("subcategory", { category: cat });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename a category (updates all products in that category)
router.patch("/categories/rename", auth, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: "oldName and newName required" });
    const result = await Product.updateMany({ category: oldName }, { category: newName });
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename a subcategory within a category
router.patch("/categories/rename-sub", auth, async (req, res) => {
  try {
    const { category, oldSub, newSub } = req.body;
    if (!category || !oldSub || !newSub) return res.status(400).json({ error: "category, oldSub, newSub required" });
    const result = await Product.updateMany({ category, subcategory: oldSub }, { subcategory: newSub });
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete entire category (deletes all products in it)
router.delete("/categories/:categoryName", auth, async (req, res) => {
  try {
    const result = await Product.deleteMany({ category: req.params.categoryName });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subcategory (deletes all products in that subcategory)
router.delete("/categories/:categoryName/sub/:subName", auth, async (req, res) => {
  try {
    const result = await Product.deleteMany({
      category: req.params.categoryName,
      subcategory: req.params.subName
    });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product with image
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, subcategory, emoji, sizes, available } = req.body;

    const product = new Product({
      name,
      description,
      price: Number(price),
      category,
      subcategory,
      emoji: emoji || "🛍️",
      sizes: sizes ? JSON.parse(sizes) : [],
      available: available !== "false",
      imageUrl: req.file ? req.file.path : "",
      imagePublicId: req.file ? req.file.filename : "",
    });

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { name, description, price, category, subcategory, emoji, sizes, available } = req.body;

    // If new image uploaded, delete old one from Cloudinary
    if (req.file && product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId);
    }

    product.name = name || product.name;
    product.description = description ?? product.description;
    product.price = price ? Number(price) : product.price;
    product.category = category || product.category;
    product.subcategory = subcategory || product.subcategory;
    product.emoji = emoji || product.emoji;
    product.sizes = sizes ? JSON.parse(sizes) : product.sizes;
    product.available = available !== undefined ? available !== "false" : product.available;
    if (req.file) {
      product.imageUrl = req.file.path;
      product.imagePublicId = req.file.filename;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle availability
router.patch("/:id/toggle", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    product.available = !product.available;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId);
    }
    await product.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;