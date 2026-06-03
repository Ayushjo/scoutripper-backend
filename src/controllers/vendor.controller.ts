import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as VendorService from "../services/vendor.service";
import { AddSlotsBody, ListingBody, UpdateSlotBody } from "../services/vendor.service";

// Shared guard: requireAuth already runs, but we assert req.user exists as a
// belt-and-suspenders check before touching vendor data.
function assertUser(req: AuthRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized — please login" });
    return false;
  }
  return true;
}

// Parse a numeric vendor_id string from query/body and return the BigInt, or
// write a 400 and return null.
function parseVendorId(raw: unknown, res: Response): bigint | null {
  const str = String(raw ?? "");
  if (!/^\d+$/.test(str)) {
    res.status(400).json({ success: false, message: "Invalid vendor_id" });
    return null;
  }
  return BigInt(str);
}

// ─── Task 1: GET /api/v1/vendor/treks ────────────────────────────────────────

export const getTreks = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const treks = await VendorService.getPublishedTreks();
    res.json({ success: true, data: treks });
  } catch (error) {
    console.error("vendor.getTreks error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 2: POST /api/v1/vendor/listings ────────────────────────────────────

export const createListing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const body = req.body as ListingBody;
    const result = await VendorService.createListing(body);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("vendor.createListing error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 3: PATCH /api/v1/vendor/listings/:id ───────────────────────────────

export const updateListing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid listing ID" });
      return;
    }

    const body = req.body as Partial<ListingBody> & { vendor_id?: number };
    const vendorId = parseVendorId(body.vendor_id, res);
    if (vendorId === null) return;

    const result = await VendorService.updateListing(
      BigInt(rawId),
      vendorId,
      body,
    );

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("vendor.updateListing error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 4: GET /api/v1/vendor/listings ─────────────────────────────────────

export const getVendorListings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const vendorId = parseVendorId(req.query.vendor_id, res);
    if (vendorId === null) return;

    const listings = await VendorService.getVendorListings(vendorId);
    res.json({ success: true, data: listings });
  } catch (error) {
    console.error("vendor.getVendorListings error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 5: GET /api/v1/vendor/listings/:id ─────────────────────────────────

export const getVendorListingDetail = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid listing ID" });
      return;
    }

    const vendorId = parseVendorId(req.query.vendor_id, res);
    if (vendorId === null) return;

    const result = await VendorService.getVendorListingDetail(BigInt(rawId), vendorId);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("vendor.getVendorListingDetail error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 6: POST /api/v1/vendor/listings/:id/slots ──────────────────────────

export const addSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid listing ID" });
      return;
    }

    const body = req.body as AddSlotsBody;
    const vendorId = parseVendorId(body.vendor_id, res);
    if (vendorId === null) return;

    if (!Array.isArray(body.slots) || body.slots.length === 0) {
      res.status(400).json({ success: false, message: "slots array is required and must not be empty" });
      return;
    }

    const result = await VendorService.addSlots(BigInt(rawId), vendorId, body);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("vendor.addSlots error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 7: PATCH /api/v1/vendor/slots/:id ──────────────────────────────────

export const updateSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid slot ID" });
      return;
    }

    const body = req.body as UpdateSlotBody;
    const vendorId = parseVendorId(body.vendor_id, res);
    if (vendorId === null) return;

    const { vendor_id: _v, ...slotFields } = body;
    const result = await VendorService.updateSlot(BigInt(rawId), vendorId, slotFields);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("vendor.updateSlot error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── Task 8: DELETE /api/v1/vendor/slots/:id ─────────────────────────────────

export const deleteSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!assertUser(req, res)) return;

  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid slot ID" });
      return;
    }

    // vendor_id from query param (DELETE has no standard body)
    const vendorId = parseVendorId(req.query.vendor_id, res);
    if (vendorId === null) return;

    const result = await VendorService.deleteSlot(BigInt(rawId), vendorId);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: "Slot deleted successfully" });
  } catch (error) {
    console.error("vendor.deleteSlot error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
