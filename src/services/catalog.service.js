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

      try {
        await axios.post(`${BASE_URL}/${existing.id}`, updatePayload, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        });
        console.log(`✅ Updated catalog (preserved images): ${product.name}`);
      } catch (updateErr) {
        console.error(`❌ FULL update payload for ${product.name}:`, JSON.stringify(updatePayload, null, 2));
        console.error(`❌ FULL Meta error response for ${product.name}:`, JSON.stringify(updateErr.response?.data, null, 2));
        throw updateErr;
      }
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

      try {
        await axios.post(`${BASE_URL}/${CATALOG_ID}/products`, createPayload, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        });
        console.log(`✅ Added to catalog: ${product.name}`);
      } catch (createErr) {
        console.error(`❌ FULL create payload for ${product.name}:`, JSON.stringify(createPayload, null, 2));
        console.error(`❌ FULL Meta error response for ${product.name}:`, JSON.stringify(createErr.response?.data, null, 2));
        throw createErr;
      }
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sync all products — with a short pause between each write and one retry on
// Meta's "(#100) Error persisting items" quirk, which shows up when catalog
// writes are fired back-to-back with no gap between them.
const syncAllProducts = async (products) => {
  console.log(`🔄 Syncing ${products.length} products to catalog...`);
  let success = 0, failed = 0;
  const failedNames = [];

  for (const product of products) {
    if (product.available && product.images?.length > 0) {
      let result = await syncProductToCatalog(product);

      if (!result.success) {
        // One retry after a short pause — covers the transient "persisting items" case
        await sleep(1200);
        result = await syncProductToCatalog(product);
      }

      if (result.success) {
        success++;
      } else {
        failed++;
        failedNames.push(product.name);
      }

      // Breathing room between every product so Meta doesn't throttle the batch
      await sleep(400);
    }
  }

  console.log(`✅ Catalog sync complete: ${success} synced, ${failed} failed`);
  if (failedNames.length) console.log(`❌ Failed products: ${failedNames.join(", ")}`);
  return { success, failed, failedNames };
};

module.exports = { syncProductToCatalog, removeFromCatalog, syncAllProducts };