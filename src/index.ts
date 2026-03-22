import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import trekRoutes from "./routes/trek.routes";

dotenv.config();
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());


app.use("/api/v1/treks", trekRoutes);


app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "ScoutRipper API running" });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

export default app;
