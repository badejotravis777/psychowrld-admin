const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Product = require("../models/product.model");
const { upload, uploadMultiple, cloudinary } = require("../config/cloudinary");
const { syncProductToCatalog, removeFromCatalog, syncAllProducts } = require("../services/catalog.service");

// Get the subcategory that applies to a product for a specific category
// Falls back to the legacy flat `subcategory` field for older products
// that haven't been re-saved since multi-category support was added
function getSubcategoryForCategory(product, category) {
  if (product.categorySubcategories && product.categorySubcategories.length > 0) {
    const match = product.categorySubcategories.find((cs) => cs.category === category);
    if (match) return match.subcategory || "";
  }
  return product.subcategory || "";
}

// Get all products
router.get("/", auth, async (req, res) => {
  try {
    const { category, subcategory, available } = req.query;
    const filter = {};
    if (category) filter.categories = category;
    if (subcategory) filter.subcategory = subcategory;
    if (available !== undefined) filter.available = available === "true";
    const products = await Product.find(filter).sort({ categories: 1, subcategory: 1, name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all categories with subcategories
router.get("/categories", auth, async (req, res) => {
  try {
    const products = await Product.find({});
    const result = {};
    for (const p of products) {
      for (const cat of p.categories || []) {
        if (!result[cat]) result[cat] = new Set();
        const sub = getSubcategoryForCategory(p, cat);
        if (sub) result[cat].add(sub);
      }
    }
    const finalResult = {};
    for (const cat of Object.keys(result)) {
      finalResult[cat] = [...result[cat]];
    }
    res.json(finalResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename a category
router.patch("/categories/rename", auth, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: "oldName and newName required" });
    const result = await Product.updateMany(
      { categories: oldName },
      { $set: { "categories.$[elem]": newName } },
      { arrayFilters: [{ elem: oldName }] }
    );
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename a subcategory
router.patch("/categories/rename-sub", auth, async (req, res) => {
  try {
    const { category, oldSub, newSub } = req.body;
    if (!category || !oldSub || !newSub) return res.status(400).json({ error: "category, oldSub, newSub required" });

    const result1 = await Product.updateMany(
      { categories: category, subcategory: oldSub },
      { subcategory: newSub }
    );

    const result2 = await Product.updateMany(
      { categorySubcategories: { $elemMatch: { category, subcategory: oldSub } } },
      { $set: { "categorySubcategories.$[elem].subcategory": newSub } },
      { arrayFilters: [{ "elem.category": category, "elem.subcategory": oldSub }] }
    );

    res.json({ updated: result1.modifiedCount + result2.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete entire category
router.delete("/categories/:categoryName", auth, async (req, res) => {
  try {
    const categoryName = req.params.categoryName;

    await Product.updateMany(
      { categories: categoryName },
      { $pull: { categories: categoryName } }
    );

    const result = await Product.deleteMany({ categories: { $size: 0 } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subcategory
router.delete("/categories/:categoryName/sub/:subName", auth, async (req, res) => {
  try {
    const { categoryName, subName } = req.params;
    const products = await Product.find({ categories: categoryName });
    let deleted = 0;

    for (const p of products) {
      const sub = getSubcategoryForCategory(p, categoryName);
      if (sub !== subName) continue;

      if (p.categories.length > 1) {
        p.categories = p.categories.filter((c) => c !== categoryName);
        p.categorySubcategories = (p.categorySubcategories || []).filter((cs) => cs.category !== categoryName);
        await p.save();
      } else {
        for (const publicId of (p.imagePublicIds || [])) {
          await cloudinary.uploader.destroy(publicId);
        }
        removeFromCatalog(p._id.toString()).catch(console.error);
        await p.deleteOne();
        deleted++;
      }
    }

    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product with multiple images
router.post("/", auth, uploadMultiple, async (req, res) => {
  try {
    const { name, description, price, categories, subcategory, categorySubcategories, badge, emoji, sizes, colors, customAttributes, available } = req.body;
    const images = req.files ? req.files.map(f => f.path) : [];
    const imagePublicIds = req.files ? req.files.map(f => f.filename) : [];

    const parsedCategorySubcategories = categorySubcategories ? JSON.parse(categorySubcategories) : [];
    const legacySubcategory = parsedCategorySubcategories[0]?.subcategory || subcategory || "";

    const product = new Product({
      name,
      description,
      price: Number(price),
      categories: categories ? JSON.parse(categories) : [],
      subcategory: legacySubcategory,
      categorySubcategories: parsedCategorySubcategories,
      badge: badge || "none",
      emoji: emoji || "🛍️",
      sizes: sizes ? JSON.parse(sizes) : [],
      colors: colors ? JSON.parse(colors) : [],
      customAttributes: customAttributes ? JSON.parse(customAttributes) : [],
      available: available !== "false",
      images,
      imagePublicIds,
      imageUrl: images[0] || "",
      imagePublicId: imagePublicIds[0] || "",
    });

    await product.save();
    syncProductToCatalog(product).catch(console.error);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put("/:id", auth, uploadMultiple, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { name, description, price, categories, subcategory, categorySubcategories, badge, emoji, sizes, colors, customAttributes, available, removeImages } = req.body;

    if (removeImages) {
      const toRemove = JSON.parse(removeImages);
      for (const publicId of toRemove) {
        await cloudinary.uploader.destroy(publicId);
      }
      product.imagePublicIds = product.imagePublicIds.filter(id => !toRemove.includes(id));
      product.images = product.images.filter((_, i) => !toRemove.includes(product.imagePublicIds[i]));
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path);
      const newPublicIds = req.files.map(f => f.filename);
      product.images = [...(product.images || []), ...newImages];
      product.imagePublicIds = [...(product.imagePublicIds || []), ...newPublicIds];
    }

    product.name = name || product.name;
    product.description = description ?? product.description;
    product.price = price ? Number(price) : product.price;
    product.categories = categories ? JSON.parse(categories) : product.categories;

    if (categorySubcategories !== undefined) {
      const parsed = JSON.parse(categorySubcategories);
      product.categorySubcategories = parsed;
      product.subcategory = parsed[0]?.subcategory || "";
    } else if (subcategory !== undefined) {
      product.subcategory = subcategory;
    }
    product.badge = badge !== undefined ? badge : product.badge;
    product.emoji = emoji || product.emoji;
    product.sizes = sizes ? JSON.parse(sizes) : product.sizes;
    product.colors = colors ? JSON.parse(colors) : product.colors;
    product.customAttributes = customAttributes ? JSON.parse(customAttributes) : product.customAttributes;
    product.available = available !== undefined ? available !== "false" : product.available;
    product.imageUrl = product.images[0] || "";
    product.imagePublicId = product.imagePublicIds[0] || "";

    await product.save();
    syncProductToCatalog(product).catch(console.error);
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
    syncProductToCatalog(product).catch(console.error);
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
    for (const publicId of (product.imagePublicIds || [])) {
      await cloudinary.uploader.destroy(publicId);
    }
    removeFromCatalog(product._id.toString()).catch(console.error);
    await product.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate a product
router.post("/:id/duplicate", auth, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id);
    if (!original) return res.status(404).json({ error: "Product not found" });

    const duplicate = new Product({
      name: `${original.name} (Copy)`,
      description: original.description,
      price: original.price,
      categories: original.categories,
      subcategory: original.subcategory,
      categorySubcategories: original.categorySubcategories,
      badge: original.badge,
      emoji: original.emoji,
      sizes: original.sizes,
      colors: original.colors,
      customAttributes: original.customAttributes,
      available: false,
      images: original.images,
      imagePublicIds: [],
      imageUrl: original.imageUrl,
      imagePublicId: "",
    });

    await duplicate.save();
    res.json(duplicate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all products to catalog
router.post("/sync-catalog", auth, async (req, res) => {
  try {
    const products = await Product.find({ available: true });
    const result = await syncAllProducts(products);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle entire category active/inactive
router.patch("/categories/:categoryName/toggle", auth, async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { available } = req.body;
    const products = await Product.find({ categories: categoryName });
    let updated = 0;
    for (const p of products) {
      p.available = available;
      await p.save();
      updated++;
    }
    res.json({ updated, available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle a subcategory active/inactive
router.patch("/categories/:categoryName/sub/:subName/toggle", auth, async (req, res) => {
  try {
    const { categoryName, subName } = req.params;
    const { available } = req.body;
    const products = await Product.find({ categories: categoryName });
    let updated = 0;
    for (const p of products) {
      const sub = getSubcategoryForCategory(p, categoryName);
      if (sub === subName) {
        p.available = available;
        await p.save();
        updated++;
      }
    }
    res.json({ updated, available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

module.exports = router;