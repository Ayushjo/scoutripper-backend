import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";

// ─── Local helpers (same pattern as listing.service.ts) ───────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function buildImageGallery(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => (typeof item === "string" ? buildImageUrl(item) : item));
}

// ─── Shared body types ────────────────────────────────────────────────────────

export interface ListingBody {
  vendor_id: number;
  trek_id?: number;
  title?: string;
  difficulty?: string;
  duration_days?: number;
  duration_nights?: number;      // stored in trek_listings.duration_nights
  physical_fitness?: string;     // stored in trek_listings.physical_fitness
  intro_text?: string;
  itinerary?: unknown;
  inclusions?: unknown;
  exclusions?: unknown;
  things_to_carry?: unknown;
  highlights?: unknown;
  price?: number;
  sale_price?: number;
  route_name?: string;
  tags?: unknown;
  meeting_point?: string;
  distance_km?: string;
  elevation_gain?: string;
  ascent_time?: string;
  descent_time?: string;
  cancellation_policy?: string;
}

export interface SlotInput {
  start_date: string;
  end_date?: string;   // optional — auto-computed as start_date + listing.duration_days if omitted
  total_seats: number;
  price?: number;      // per-slot price override; falls back to listing price when null
  min_seats?: number;  // group size minimum (default 1)
}

export interface AddSlotsBody {
  vendor_id: number;
  cancellation_policy?: string;
  slots: SlotInput[];
}

export interface UpdateSlotBody {
  vendor_id: number;
  total_seats?: number;
  min_seats?: number;  // group size minimum
  price?: number;      // per-slot price override
  status?: string;
}

// ─── Task 1: GET published treks (vendor trek picker) ─────────────────────────

export const getPublishedTreks = async () => {
  const treks = await prisma.trek.findMany({
    where: { status: "publish", deletedAt: null },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      bannerImage: true,
      location: {
        select: { name: true },
      },
    },
  });

  return treks.map((t) => ({
    id: t.id.toString(),
    title: t.title,
    slug: t.slug,
    bannerImage: buildImageUrl(t.bannerImage),
    location: t.location?.name ?? null,
  }));
};

// ─── Task 2: Create listing (draft) ──────────────────────────────────────────

export const createListing = async (
  body: ListingBody,
): Promise<{ data: { id: string } } | { error: string; status: 400 }> => {
  if (!body.vendor_id || !body.trek_id) {
    return { error: "vendor_id and trek_id are required", status: 400 };
  }

  const listing = await prisma.trek_listings.create({
    data: {
      vendor_id: BigInt(body.vendor_id),
      trek_id: BigInt(body.trek_id),
      title: body.title ?? "Untitled Listing",
      status: "draft",
      difficulty: body.difficulty ?? null,
      duration_days: body.duration_days ?? null,
      duration_nights: body.duration_nights ?? null,
      physical_fitness: body.physical_fitness ?? null,
      intro_text: body.intro_text ?? null,
      ...(body.itinerary !== undefined ? { itinerary: body.itinerary as never } : {}),
      ...(body.inclusions !== undefined ? { inclusions: body.inclusions as never } : {}),
      ...(body.exclusions !== undefined ? { exclusions: body.exclusions as never } : {}),
      ...(body.things_to_carry !== undefined ? { things_to_carry: body.things_to_carry as never } : {}),
      ...(body.highlights !== undefined ? { highlights: body.highlights as never } : {}),
      price: body.price ?? null,
      sale_price: body.sale_price ?? null,
      route_name: body.route_name ?? null,
      ...(body.tags !== undefined ? { tags: body.tags as never } : {}),
      meeting_point: body.meeting_point ?? null,
      distance_km: body.distance_km ?? null,
      elevation_gain: body.elevation_gain ?? null,
      ascent_time: body.ascent_time ?? null,
      descent_time: body.descent_time ?? null,
      cancellation_policy: body.cancellation_policy ?? null,
    },
    select: { id: true },
  });

  return { data: { id: listing.id.toString() } };
};

// ─── Task 3: Update listing ───────────────────────────────────────────────────

export const updateListing = async (
  listingId: bigint,
  vendorId: bigint,
  body: Partial<Omit<ListingBody, "vendor_id">>,
): Promise<{ data: { id: string } } | { error: string; status: 403 | 404 }> => {
  const existing = await prisma.trek_listings.findUnique({
    where: { id: listingId },
    select: { id: true, vendor_id: true },
  });

  if (!existing) return { error: "Listing not found", status: 404 };

  if (existing.vendor_id === null || existing.vendor_id !== vendorId) {
    return { error: "Forbidden — this listing belongs to another vendor", status: 403 };
  }

  const updated = await prisma.trek_listings.update({
    where: { id: listingId },
    data: {
      ...(body.trek_id !== undefined ? { trek_id: BigInt(body.trek_id) } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
      ...(body.duration_days !== undefined ? { duration_days: body.duration_days } : {}),
      ...(body.duration_nights !== undefined ? { duration_nights: body.duration_nights } : {}),
      ...(body.physical_fitness !== undefined ? { physical_fitness: body.physical_fitness } : {}),
      ...(body.intro_text !== undefined ? { intro_text: body.intro_text } : {}),
      ...(body.itinerary !== undefined ? { itinerary: body.itinerary as never } : {}),
      ...(body.inclusions !== undefined ? { inclusions: body.inclusions as never } : {}),
      ...(body.exclusions !== undefined ? { exclusions: body.exclusions as never } : {}),
      ...(body.things_to_carry !== undefined ? { things_to_carry: body.things_to_carry as never } : {}),
      ...(body.highlights !== undefined ? { highlights: body.highlights as never } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.sale_price !== undefined ? { sale_price: body.sale_price } : {}),
      ...(body.route_name !== undefined ? { route_name: body.route_name } : {}),
      ...(body.tags !== undefined ? { tags: body.tags as never } : {}),
      ...(body.meeting_point !== undefined ? { meeting_point: body.meeting_point } : {}),
      ...(body.distance_km !== undefined ? { distance_km: body.distance_km } : {}),
      ...(body.elevation_gain !== undefined ? { elevation_gain: body.elevation_gain } : {}),
      ...(body.ascent_time !== undefined ? { ascent_time: body.ascent_time } : {}),
      ...(body.descent_time !== undefined ? { descent_time: body.descent_time } : {}),
      ...(body.cancellation_policy !== undefined ? { cancellation_policy: body.cancellation_policy } : {}),
    },
    select: { id: true },
  });

  return { data: { id: updated.id.toString() } };
};

// ─── Task 4: Get all listings for a vendor ────────────────────────────────────

interface VendorListingRow {
  id: bigint;
  title: string;
  status: string | null;
  trek_title: string | null;
  trek_slug: string | null;
  trek_banner: string | null;
  slot_count: number;
}

export const getVendorListings = async (vendorId: bigint) => {
  const rows = await prisma.$queryRaw<VendorListingRow[]>`
    SELECT
      tl.id,
      tl.title,
      tl.status,
      t.title        AS trek_title,
      t.slug         AS trek_slug,
      t.banner_image AS trek_banner,
      (
        SELECT COUNT(*)::int
        FROM trek_slots ts
        WHERE ts.listing_id = tl.id
      ) AS slot_count
    FROM trek_listings tl
    LEFT JOIN treks t ON t.id = tl.trek_id
    WHERE tl.vendor_id = ${vendorId}
    ORDER BY tl.created_at DESC
  `;

  return rows.map((r) => ({
    id: r.id.toString(),
    title: r.title,
    status: r.status,
    trek: r.trek_title
      ? {
          title: r.trek_title,
          slug: r.trek_slug,
          bannerImage: buildImageUrl(r.trek_banner),
        }
      : null,
    slot_count: r.slot_count,
  }));
};

// ─── Task 5: Get vendor listing detail (all fields, all slots) ────────────────

export const getVendorListingDetail = async (
  listingId: bigint,
  vendorId: bigint,
): Promise<{ data: object } | { error: string; status: 403 | 404 }> => {
  const listing = await prisma.trek_listings.findUnique({
    where: { id: listingId },
    include: {
      vendors: {
        select: {
          id: true,
          name: true,
          logo: true,
          description: true,
          is_verified: true,
          phone: true,
          email: true,
        },
      },
      trek_leaders: {
        select: {
          id: true,
          name: true,
          image: true,
          experience_years: true,
          certifications: true,
          bio: true,
          rating: true,
          review_count: true,
        },
      },
      treks: {
        select: {
          id: true,
          title: true,
          slug: true,
          altitude: true,
          difficulty: true,
          reviewScore: true,
          bannerImage: true,
          gallery: true,
          featureImages: true,
        },
      },
      // No date/status filter — vendor sees all slots including past/draft
      trek_slots: {
        orderBy: { start_date: "asc" },
        select: {
          id: true,
          start_date: true,
          end_date: true,
          total_seats: true,
          available_seats: true,
          booked_seats: true,
          status: true,
          price: true,
          min_seats: true,
        },
      },
    },
  });

  if (!listing) return { error: "Listing not found", status: 404 };

  if (listing.vendor_id === null || listing.vendor_id !== vendorId) {
    return { error: "Forbidden — this listing belongs to another vendor", status: 403 };
  }

  if (!listing.vendors) return { error: "Listing not found", status: 404 };

  const slots = listing.trek_slots.map((s) => ({
    id: s.id.toString(),
    start_date: formatDate(s.start_date),
    end_date: formatDate(s.end_date),
    total_seats: s.total_seats,
    available_seats: s.available_seats,
    booked_seats: s.booked_seats ?? 0,
    status: s.status ?? "open",
    price: s.price ?? null,           // null means use listing base price
    min_seats: s.min_seats ?? 1,
  }));

  const trek_images = {
    banner: buildImageUrl(listing.treks?.bannerImage ?? null),
    gallery: buildImageGallery(listing.treks?.gallery ?? null),
    feature_images: buildImageGallery(listing.treks?.featureImages ?? null),
  };

  return {
    data: {
      id: listing.id.toString(),
      title: listing.title,
      tags: listing.tags,
      route_name: listing.route_name,
      price: listing.price,
      sale_price: listing.sale_price,
      duration_days: listing.duration_days,
      duration_nights: listing.duration_nights,
      physical_fitness: listing.physical_fitness,
      distance_km: listing.distance_km,
      elevation_gain: listing.elevation_gain,
      ascent_time: listing.ascent_time,
      descent_time: listing.descent_time,
      difficulty: listing.difficulty,
      meeting_point: listing.meeting_point,
      intro_text: listing.intro_text,
      itinerary: listing.itinerary,
      inclusions: listing.inclusions,
      exclusions: listing.exclusions,
      highlights: listing.highlights,
      things_to_carry: listing.things_to_carry,
      cancellation_policy: listing.cancellation_policy,
      is_popular: listing.is_popular ?? false,
      status: listing.status,
      trek_images,
      vendor: {
        id: listing.vendors.id.toString(),
        name: listing.vendors.name,
        logo: listing.vendors.logo,
        description: listing.vendors.description,
        is_verified: listing.vendors.is_verified ?? false,
        phone: listing.vendors.phone,
        email: listing.vendors.email ?? null,
      },
      trek_leader: listing.trek_leaders
        ? {
            id: listing.trek_leaders.id.toString(),
            name: listing.trek_leaders.name,
            image: listing.trek_leaders.image,
            experience_years: listing.trek_leaders.experience_years,
            certifications: listing.trek_leaders.certifications,
            bio: listing.trek_leaders.bio,
            rating: listing.trek_leaders.rating,
            review_count: listing.trek_leaders.review_count ?? 0,
          }
        : null,
      trek: listing.treks
        ? {
            id: listing.treks.id.toString(),
            title: listing.treks.title,
            slug: listing.treks.slug,
            altitude: listing.treks.altitude,
            difficulty: listing.treks.difficulty,
            reviewScore: listing.treks.reviewScore,
          }
        : null,
      slots,
    },
  };
};

// ─── Task 6: Add slots to a listing ──────────────────────────────────────────

export const addSlots = async (
  listingId: bigint,
  vendorId: bigint,
  body: AddSlotsBody,
): Promise<{ data: { count: number } } | { error: string; status: 400 | 403 | 404 | 429 }> => {
  if (!body.slots?.length) {
    return { error: "At least one slot is required", status: 400 };
  }

  // Validate each slot: start_date within 365 days; if end_date provided it must be >= start_date
  const maxAllowedDate = new Date();
  maxAllowedDate.setDate(maxAllowedDate.getDate() + 365);
  for (const slot of body.slots) {
    const start = new Date(slot.start_date);
    if (start > maxAllowedDate) {
      return {
        error: `Slot start_date ${slot.start_date} exceeds the maximum allowed date of 365 days from today`,
        status: 400,
      };
    }
    if (slot.end_date !== undefined) {
      const end = new Date(slot.end_date);
      if (end < start) {
        return {
          error: `Slot end_date (${slot.end_date}) must be on or after start_date (${slot.start_date})`,
          status: 400,
        };
      }
    }
  }

  const listing = await prisma.trek_listings.findUnique({
    where: { id: listingId },
    // duration_days is needed to auto-compute end_date when the caller omits it
    select: { id: true, vendor_id: true, status: true, duration_days: true },
  });

  if (!listing) return { error: "Listing not found", status: 404 };

  if (listing.vendor_id === null || listing.vendor_id !== vendorId) {
    return { error: "Forbidden — this listing belongs to another vendor", status: 403 };
  }

  // Run open-slot cap and rate-limit checks in parallel
  const [openCountRows, recentCountRows] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM trek_slots ts
      JOIN trek_listings tl ON tl.id = ts.listing_id
      WHERE tl.vendor_id = ${vendorId}
        AND ts.status = 'open'
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM trek_slots ts
      JOIN trek_listings tl ON tl.id = ts.listing_id
      WHERE tl.vendor_id = ${vendorId}
        AND ts.created_at >= NOW() - INTERVAL '1 hour'
    `,
  ]);

  if (Number(openCountRows[0]?.count ?? 0) >= 1000) {
    return {
      error: "Vendor has reached the maximum of 1000 open slots across all listings",
      status: 400,
    };
  }

  if (Number(recentCountRows[0]?.count ?? 0) >= 100) {
    return { error: "Rate limit exceeded, try again later", status: 429 };
  }

  const isDraft = listing.status === "draft";
  const newCancellationPolicy = body.cancellation_policy;

  await prisma.$transaction(async (tx) => {
    await tx.trek_slots.createMany({
      data: body.slots.map((s) => {
        const startDate = new Date(s.start_date);

        // end_date is optional — auto-compute as start_date + duration_days when omitted.
        // If the listing has no duration_days set, end_date defaults to the same day.
        let endDate: Date;
        if (s.end_date) {
          endDate = new Date(s.end_date);
        } else if (listing.duration_days) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + listing.duration_days);
        } else {
          endDate = new Date(startDate);
        }

        return {
          listing_id: listingId,
          start_date: startDate,
          end_date: endDate,
          total_seats: s.total_seats,
          available_seats: s.total_seats,
          booked_seats: 0,
          status: "open",
          // per-slot price override (null means fall back to listing price on read)
          price: s.price ?? null,
          // group size minimum (default 1)
          min_seats: s.min_seats ?? 1,
        };
      }),
    });

    // Promote draft → active and optionally set cancellation_policy
    if (isDraft || newCancellationPolicy !== undefined) {
      await tx.trek_listings.update({
        where: { id: listingId },
        data: {
          ...(isDraft ? { status: "active" } : {}),
          ...(newCancellationPolicy !== undefined
            ? { cancellation_policy: newCancellationPolicy }
            : {}),
        },
      });
    }
  });

  return { data: { count: body.slots.length } };
};

const SLOT_STATUS_ENUM = new Set([
  "open",
  "sold_out",
  "completed",
  "cancelled",
  "vendor_cancel_requested",
]);

// ─── Task 7: Update a slot ────────────────────────────────────────────────────

export const updateSlot = async (
  slotId: bigint,
  vendorId: bigint,
  body: Omit<UpdateSlotBody, "vendor_id">,
): Promise<{ data: { id: string } } | { error: string; status: 400 | 403 | 404 }> => {
  if (body.status !== undefined) {
    if (!SLOT_STATUS_ENUM.has(body.status)) {
      return {
        error: `Invalid status. Allowed values: ${[...SLOT_STATUS_ENUM].join(", ")}`,
        status: 400,
      };
    }
    if (body.status === "cancelled") {
      return {
        error: "Vendors cannot set status to 'cancelled' directly — use 'vendor_cancel_requested' instead",
        status: 403,
      };
    }
  }

  const slot = await prisma.trek_slots.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      total_seats: true,
      booked_seats: true,
      trek_listings: { select: { vendor_id: true } },
    },
  });

  if (!slot || !slot.trek_listings) return { error: "Slot not found", status: 404 };

  if (slot.trek_listings.vendor_id === null || slot.trek_listings.vendor_id !== vendorId) {
    return { error: "Forbidden — this slot belongs to another vendor", status: 403 };
  }

  // Recompute available_seats when total_seats changes so the numbers stay consistent
  const bookedSeats = slot.booked_seats ?? 0;
  const newTotalSeats = body.total_seats ?? slot.total_seats;
  const newAvailableSeats = Math.max(0, newTotalSeats - bookedSeats);

  const updated = await prisma.trek_slots.update({
    where: { id: slotId },
    data: {
      ...(body.total_seats !== undefined
        ? { total_seats: body.total_seats, available_seats: newAvailableSeats }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.min_seats !== undefined ? { min_seats: body.min_seats } : {}),
    },
    select: { id: true },
  });

  return { data: { id: updated.id.toString() } };
};

// ─── Task 8: Delete a slot ────────────────────────────────────────────────────

export const deleteSlot = async (
  slotId: bigint,
  vendorId: bigint,
): Promise<{ success: true } | { error: string; status: 400 | 403 | 404 }> => {
  const slot = await prisma.trek_slots.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      booked_seats: true,
      trek_listings: { select: { vendor_id: true } },
    },
  });

  if (!slot || !slot.trek_listings) return { error: "Slot not found", status: 404 };

  if (slot.trek_listings.vendor_id === null || slot.trek_listings.vendor_id !== vendorId) {
    return { error: "Forbidden — this slot belongs to another vendor", status: 403 };
  }

  if ((slot.booked_seats ?? 0) > 0) {
    return { error: "Cannot delete a slot that has existing bookings", status: 400 };
  }

  await prisma.trek_slots.delete({ where: { id: slotId } });

  return { success: true };
};
