import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import trekRoutes from "./routes/trek.routes";
import listingRoutes from "./routes/listing.routes";
import bookingRoutes from "./routes/booking.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import locationRoutes from "./routes/location.routes";
import categoryRoutes from "./routes/category.routes";
import userRoutes from "./routes/user.routes";
import experienceRoutes from "./routes/experience.routes";
import { toNodeHandler } from "better-auth/node";
import { auth, Auth } from "./lib/auth";
dotenv.config();
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());


app.use("/api/v1/treks", trekRoutes);
app.use("/api/v1/listings", listingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/experiences", experienceRoutes);


app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "ScoutRipper API running" });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

export default app;
