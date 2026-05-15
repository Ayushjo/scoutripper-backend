import prisma from "../utils/db";
import {
  CreateBookingBody,
  BookingResponse,
  BookingDetailResponse,
} from "../types/booking.types";

interface SlotWithListingRaw {
  slot_id: bigint;
  start_date: Date;
  end_date: Date;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  slot_status: string;
  listing_id: bigint;
  title: string;
  trek_id: bigint;
  price: number | null;
  route_name: string | null;
  difficulty: string | null;
  meeting_point: string | null;
  vendor_id: bigint;
  vendor_name: string;
  vendor_logo: string | null;
  vendor_phone: string | null;
}

interface BookingListRaw {
  id: bigint;
  item_name: string | null;
  item_type: string | null;
  status: string | null;
  amount_paid: number | null;
  adult_count: bigint | null;
  children_count: bigint | null;
  scheduled_on: Date | null;
  created_at: Date | null;
  special_request: string | null;
  listing_id: bigint | null;
  listing_title: string | null;
  route_name: string | null;
  vendor_id: bigint | null;
  vendor_name: string | null;
  vendor_logo: string | null;
  vendor_phone: string | null;
  slot_id: bigint | null;
  slot_start_date: Date | null;
  slot_end_date: Date | null;
  total_seats: number | null;
  slot_available_seats: number | null;
  slot_status: string | null;
  trek_id: bigint | null;
  trek_title: string | null;
  trek_slug: string | null;
  trek_banner: string | null;
}

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().split("T")[0] : String(d);
}

function serializeBookingList(r: BookingListRaw): BookingResponse {
  return {
    id: r.id.toString(),
    item_name: r.item_name,
    item_type: r.item_type,
    status: r.status,
    amount_paid: r.amount_paid,
    adult_count: r.adult_count ? Number(r.adult_count) : 0,
    children_count: r.children_count ? Number(r.children_count) : 0,
    scheduled_on: fmt(r.scheduled_on),
    created_at: r.created_at?.toISOString() ?? null,
    special_request: r.special_request,
    listing: r.listing_id
      ? {
          id: r.listing_id.toString(),
          title: r.listing_title ?? "",
          route_name: r.route_name,
          difficulty: null,
          meeting_point: null,
          vendor: {
            id: r.vendor_id!.toString(),
            name: r.vendor_name ?? "",
            logo: r.vendor_logo,
            phone: r.vendor_phone,
          },
        }
      : null,
    slot: r.slot_id
      ? {
          id: r.slot_id.toString(),
          start_date: fmt(r.slot_start_date)!,
          end_date: fmt(r.slot_end_date)!,
          total_seats: r.total_seats ?? 0,
          available_seats: r.slot_available_seats ?? 0,
          status: r.slot_status ?? "open",
        }
      : null,
  };
}

function serializeBookingDetail(r: BookingListRaw): BookingDetailResponse {
  return {
    ...serializeBookingList(r),
    trek: r.trek_id
      ? {
          id: r.trek_id.toString(),
          title: r.trek_title ?? "",
          slug: r.trek_slug ?? "",
          banner_image: r.trek_banner,
        }
      : null,
  };
}

export const createBooking = async (
  body: CreateBookingBody,
  user: { id: string; name: string; email: string },
): Promise<{ data: BookingResponse } | { error: string; status: 400 | 404 }> => {
  const { listing_id, slot_id, adult_count, children_count, special_request } = body;
  const totalPeople = adult_count + children_count;

  const rows = await prisma.$queryRaw<SlotWithListingRaw[]>`
    SELECT
      s.id            AS slot_id,
      s.start_date,
      s.end_date,
      s.total_seats,
      s.available_seats,
      s.booked_seats,
      s.status        AS slot_status,
      tl.id           AS listing_id,
      tl.title,
      tl.trek_id,
      tl.price,
      tl.route_name,
      tl.difficulty,
      tl.meeting_point,
      v.id            AS vendor_id,
      v.name          AS vendor_name,
      v.logo          AS vendor_logo,
      v.phone         AS vendor_phone
    FROM trek_slots s
    JOIN trek_listings tl ON tl.id = s.listing_id
    JOIN vendors v ON v.id = tl.vendor_id
    WHERE s.id = ${BigInt(slot_id)}
      AND tl.id = ${BigInt(listing_id)}
      AND tl.status = 'active'
  `;

  if (!rows.length) {
    return { error: "Listing or slot not found", status: 404 };
  }

  const d = rows[0];

  if (d.available_seats < totalPeople) {
    return { error: "Not enough seats available", status: 400 };
  }

  const total = totalPeople * (d.price ?? 0);
  const newAvailable = d.available_seats - totalPeople;
  const newBooked = (d.booked_seats ?? 0) + totalPeople;
  const newSlotStatus = newAvailable === 0 ? "full" : d.slot_status;

  const booking = await prisma.$transaction(async (tx) => {
    const freshSlot = await tx.trek_slots.findUnique({
      where: { id: d.slot_id },
      select: { available_seats: true },
    });

    if (!freshSlot || freshSlot.available_seats < totalPeople) {
      throw Object.assign(new Error("Not enough seats available"), {
        code: "SEAT_CONFLICT",
      });
    }

    const b = await tx.bookings.create({
      data: {
        item_name: d.title,
        item_type: "trek",
        item_id: d.trek_id,
        item_price_total: d.listing_id,
        user_name: user.name,
        user_email: user.email,
        adult_count: BigInt(adult_count),
        children_count: BigInt(children_count),
        amount_paid: total,
        status: "pending",
        scheduled_on: d.start_date,
        special_request: special_request ?? null,
      },
    });

    await tx.trek_slots.update({
      where: { id: d.slot_id },
      data: {
        available_seats: newAvailable,
        booked_seats: newBooked,
        status: newSlotStatus,
      },
    });

    return b;
  });

  return {
    data: {
      id: booking.id.toString(),
      item_name: booking.item_name,
      item_type: booking.item_type,
      status: booking.status,
      amount_paid: booking.amount_paid,
      adult_count,
      children_count,
      scheduled_on: fmt(d.start_date),
      created_at: booking.created_at?.toISOString() ?? null,
      special_request: booking.special_request,
      listing: {
        id: d.listing_id.toString(),
        title: d.title,
        route_name: d.route_name,
        difficulty: d.difficulty,
        meeting_point: d.meeting_point,
        vendor: {
          id: d.vendor_id.toString(),
          name: d.vendor_name,
          logo: d.vendor_logo,
          phone: d.vendor_phone,
        },
      },
      slot: {
        id: d.slot_id.toString(),
        start_date: fmt(d.start_date)!,
        end_date: fmt(d.end_date)!,
        total_seats: d.total_seats,
        available_seats: newAvailable,
        status: newSlotStatus,
      },
    },
  };
};

export const getUserBookings = async (email: string): Promise<BookingResponse[]> => {
  const rows = await prisma.$queryRaw<BookingListRaw[]>`
    SELECT
      b.id, b.item_name, b.item_type, b.status, b.amount_paid,
      b.adult_count, b.children_count, b.scheduled_on, b.created_at,
      b.special_request,
      tl.id           AS listing_id,
      tl.title        AS listing_title,
      tl.route_name,
      v.id            AS vendor_id,
      v.name          AS vendor_name,
      v.logo          AS vendor_logo,
      v.phone         AS vendor_phone,
      s.id            AS slot_id,
      s.start_date    AS slot_start_date,
      s.end_date      AS slot_end_date,
      s.total_seats,
      s.available_seats AS slot_available_seats,
      s.status        AS slot_status,
      NULL::bigint    AS trek_id,
      NULL::text      AS trek_title,
      NULL::text      AS trek_slug,
      NULL::text      AS trek_banner
    FROM bookings b
    LEFT JOIN trek_listings tl ON tl.id = b.item_price_total
    LEFT JOIN vendors v ON v.id = tl.vendor_id
    LEFT JOIN LATERAL (
      SELECT id, start_date, end_date, total_seats, available_seats, status
      FROM trek_slots
      WHERE listing_id = tl.id
        AND start_date = b.scheduled_on::date
      LIMIT 1
    ) s ON true
    WHERE b.user_email = ${email}
    ORDER BY b.created_at DESC
  `;

  return rows.map(serializeBookingList);
};

export const getBookingById = async (
  id: bigint,
  email: string,
): Promise<BookingDetailResponse | null> => {
  const rows = await prisma.$queryRaw<BookingListRaw[]>`
    SELECT
      b.id, b.item_name, b.item_type, b.status, b.amount_paid,
      b.adult_count, b.children_count, b.scheduled_on, b.created_at,
      b.special_request,
      tl.id           AS listing_id,
      tl.title        AS listing_title,
      tl.route_name,
      v.id            AS vendor_id,
      v.name          AS vendor_name,
      v.logo          AS vendor_logo,
      v.phone         AS vendor_phone,
      s.id            AS slot_id,
      s.start_date    AS slot_start_date,
      s.end_date      AS slot_end_date,
      s.total_seats,
      s.available_seats AS slot_available_seats,
      s.status        AS slot_status,
      t.id            AS trek_id,
      t.title         AS trek_title,
      t.slug          AS trek_slug,
      t.banner_image  AS trek_banner
    FROM bookings b
    LEFT JOIN trek_listings tl ON tl.id = b.item_price_total
    LEFT JOIN vendors v ON v.id = tl.vendor_id
    LEFT JOIN treks t ON t.id = b.item_id
    LEFT JOIN LATERAL (
      SELECT id, start_date, end_date, total_seats, available_seats, status
      FROM trek_slots
      WHERE listing_id = tl.id
        AND start_date = b.scheduled_on::date
      LIMIT 1
    ) s ON true
    WHERE b.id = ${id} AND b.user_email = ${email}
  `;

  if (!rows.length) return null;
  return serializeBookingDetail(rows[0]);
};
