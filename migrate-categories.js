// migrate-categories.js — run once: node migrate-categories.js
require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await mongoose.connection.collection("products").find({
    category: { $exists: true },
    categories: { $exists: false },
  }).toArray();

  console.log(`Found ${products.length} products to migrate...`);

  for (const p of products) {
    await mongoose.connection.collection("products").updateOne(
      { _id: p._id },
      { $set: { categories: [p.category] } }
    );
  }

  console.log("✅ Migration complete!");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });