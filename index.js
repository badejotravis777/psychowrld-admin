require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const orderRoutes = require("./src/routes/order.routes");
const agentRoutes = require("./src/routes/agent.routes");
const deliverySettingsRoutes = require("./src/routes/deliverySettings.routes");
const agentSessionsRouter = require("./src/routes/agent-sessions.routes");


const app = express();
app.use(cors());
app.use(express.json());

// Serve static admin frontend
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/delivery-settings", deliverySettingsRoutes);
app.use("/api/agent-sessions", agentSessionsRouter);

// Fallback to index.html
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("✅ MongoDB connected");
  app.listen(process.env.PORT || 4000, () => {
    console.log(`🚀 Admin dashboard running on port ${process.env.PORT || 4000}`);
  });
}).catch(err => {
  console.error("❌ MongoDB error:", err);
  process.exit(1);
});