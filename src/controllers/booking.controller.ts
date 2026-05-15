import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as BookingService from "../services/booking.service";
import { CreateBookingBody } from "../types/booking.types";

export const createBooking = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as CreateBookingBody;

    if (
      !body.listing_id ||
      !body.slot_id ||
      !body.adult_count ||
      body.adult_count < 1
    ) {
      res.status(400).json({
        success: false,
        message: "listing_id, slot_id, and adult_count are required",
      });
      return;
    }

    const result = await BookingService.createBooking(body, req.user!);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error as { code?: string }).code === "SEAT_CONFLICT"
    ) {
      res.status(400).json({ success: false, message: "Not enough seats available" });
      return;
    }
    console.error("createBooking error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUserBookings = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const bookings = await BookingService.getUserBookings(req.user!.email);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("getUserBookings error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getBookingById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid booking ID" });
      return;
    }

    const booking = await BookingService.getBookingById(
      BigInt(rawId),
      req.user!.email,
    );

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("getBookingById error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
