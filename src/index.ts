import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import trekRoutes from "./routes/trek.routes";
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


app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "ScoutRipper API running" });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

export default app;
