import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as BookingController from "../controllers/booking.controller";

const router = Router();

router.post("/", requireAuth, BookingController.createBooking);
router.get("/", requireAuth, BookingController.getUserBookings);
router.get("/:id", requireAuth, BookingController.getBookingById);

export default router;
