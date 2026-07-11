const axios = require("axios");

const CATALOG_ID = process.env.CATALOG_ID;
const BASE_URL = `https://graph.facebook.com/v19.0`;
const getToken = () => process.env.META_ACCESS_TOKEN;

const syncProductToCatalog = async (product) => {
  try {
    if (!product.images || product.images.length === 0) {
      console.log(`⚠️ No image for ${product.name} — skipping catalog sync`);
      return { success: false, reason: "no_image" };
    }

    const payload = {
        retailer_id: product._id.toString(),
        name: product.name,
        description: product.description || product.name,
        price: product.price * 100,
        currency: "NGN",
        availability: product.available ? "in stock" : "out of stock",
        condition: "new",
        image_url: product.images[0],
        url: `https://psychowrld-bot.onrender.com/product/${product._id}`,
        brand: "Psychowrld",
        category: product.category,
        custom_label_0: product.subcategory,
        additional_image_urls: product.images.slice(1),
      };
      
    const existingRes = await axios.get(
      `${BASE_URL}/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${product._id}"}}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );

    const existing = existingRes.data?.data?.[0];

    if (existing) {
      await axios.post(`${BASE_URL}/${existing.id}`, payload, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      console.log(`✅ Updated catalog: ${product.name}`);
    } else {
      await axios.post(`${BASE_URL}/${CATALOG_ID}/products`, payload, {
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      console.log(`✅ Added to catalog: ${product.name}`);
    }

    return { success: true };
  } catch (err) {
    console.error(`❌ Catalog sync error:`, err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

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
    return { success: true };
  } catch (err) {
    return { success: false };
  }
};

const syncAllProducts = async (products) => {
  let success = 0, failed = 0;
  for (const product of products) {
    if (product.available && product.images?.length > 0) {
      const result = await syncProductToCatalog(product);
      result.success ? success++ : failed++;
    }
  }
  return { success, failed };
};

module.exports = { syncProductToCatalog, removeFromCatalog, syncAllProducts };