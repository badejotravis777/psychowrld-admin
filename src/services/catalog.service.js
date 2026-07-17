const axios = require("axios");

const CATALOG_ID = process.env.CATALOG_ID;
const BASE_URL = `https://graph.facebook.com/v19.0`;

const getToken = () => process.env.META_ACCESS_TOKEN;

// Push a single product to Meta catalog
const syncProductToCatalog = async (product) => {
  try {
    if (!product.images || product.images.length === 0) {
      console.log(`⚠️ Skipping catalog sync for ${product.name} — no image`);
      return { success: false, reason: "no_image" };
    }

    // Check if product already exists in catalog
    const existingRes = await axios.get(
      `${BASE_URL}/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${product._id}"}}&fields=id,name,image_url,additional_image_urls`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );

    const existing = existingRes.data?.data?.[0];

    if (existing) {
      // Product exists — only update name, price, availability
      // DO NOT touch images to preserve any manually added images in Commerce Manager
      const updatePayload = {
        name: product.name,
        description: product.description || product.name,
        price: product.price * 100,
        currency: "NGN",
        availability: product.available ? "in stock" : "out of stock",
        url: `https://psychowrld-bot.onrender.com/product/${product._id}`,
        brand: "Psychowrld",
      };

      await axios.post(`${BASE_URL}/${existing.id}`, updatePayload, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      console.log(`✅ Updated catalog (preserved images): ${product.name}`);
    } else {
      // New product — create with images from our database
      const createPayload = {
        retailer_id: product._id.toString(),
        name: product.name,
        description: product.description || product.name,
        price: product.price * 100,
        currency: "NGN",
        availability: product.available ? "in stock" : "out of stock",
        condition: "new",
        image_url: product.images[0],
        additional_image_urls: product.images.slice(1),
        url: `https://psychowrld-bot.onrender.com/product/${product._id}`,
        brand: "Psychowrld",
        category: (product.categories && product.categories[0]) || "",
      };

      await axios.post(`${BASE_URL}/${CATALOG_ID}/products`, createPayload, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      console.log(`✅ Added to catalog: ${product.name}`);
    }

    return { success: true };
  } catch (err) {
    console.error(`❌ Catalog sync error for ${product.name}:`, err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

// Remove product from Meta catalog
const removeFromCatalog = async (productId) => {
  try {
    const res = await axios.get(
      `${BASE_URL}/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${productId}"}}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );

    const existing = res.data?.data?.[0];
    if (!existing) return { success: true };

    await axios.delete(`${BASE_URL}/${existing.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    console.log(`🗑️ Removed from catalog: ${productId}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Catalog remove error:`, err.response?.data || err.message);
    return { success: false };
  }
};

// Sync all products
const syncAllProducts = async (products) => {
  console.log(`🔄 Syncing ${products.length} products to catalog...`);
  let success = 0, failed = 0;

  for (const product of products) {
    if (product.available && product.images?.length > 0) {
      const result = await syncProductToCatalog(product);
      result.success ? success++ : failed++;
    }
  }

  console.log(`✅ Catalog sync complete: ${success} synced, ${failed} failed`);
  return { success, failed };
};

module.exports = { syncProductToCatalog, removeFromCatalog, syncAllProducts };