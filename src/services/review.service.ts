import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";
import { PaginationMeta } from "../types/trek.types";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function buildImageGallery(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => (typeof item === "string" ? buildImageUrl(item) : item));
}

// ─── GET /api/v1/listings/:id/reviews ──────────────────────────────────────────

interface AggregateRaw {
  total_reviews: number;
  avg_rating: number | null;
  avg_guide_expertise: number | null;
  avg_safety_protocols: number | null;
  avg_logistics_gear: number | null;
  avg_sustainability: number | null;
}

interface ReviewRaw {
  id: bigint;
  rating: number;
  title: string | null;
  body: string | null;
  photos: unknown;
  guide_expertise: number | null;
  safety_protocols: number | null;
  logistics_gear: number | null;
  sustainability: number | null;
  helpful_count: number;
  not_helpful_count: number;
  created_at: Date;
  user_name: string | null;
  user_image: string | null;
  trek_title: string | null;
  trek_slug: string | null;
  leader_name: string | null;
}

export const getListingReviews = async (
  listingId: bigint,
  page: number,
  limit: number,
) => {
  const listing = await prisma.trek_listings.findUnique({
    where: { id: listingId },
    select: { vendor_id: true },
  });

  if (!listing || !listing.vendor_id) return null;

  const vendorId = listing.vendor_id;
  const skip = (page - 1) * limit;

  const [aggregateRows, reviewRows] = await Promise.all([
    prisma.$queryRaw<AggregateRaw[]>`
      SELECT
        COUNT(*)::int                                      AS total_reviews,
        ROUND(AVG(rating)::numeric, 1)::float8             AS avg_rating,
        ROUND(AVG(guide_expertise)::numeric, 1)::float8    AS avg_guide_expertise,
        ROUND(AVG(safety_protocols)::numeric, 1)::float8   AS avg_safety_protocols,
        ROUND(AVG(logistics_gear)::numeric, 1)::float8     AS avg_logistics_gear,
        ROUND(AVG(sustainability)::numeric, 1)::float8     AS avg_sustainability
      FROM reviews
      WHERE vendor_id = ${vendorId} AND status = 'published'
    `,
    prisma.$queryRaw<ReviewRaw[]>`
      SELECT
        r.id, r.rating, r.title, r.body, r.photos,
        r.guide_expertise, r.safety_protocols, r.logistics_gear, r.sustainability,
        r.helpful_count, r.not_helpful_count, r.created_at,
        u.name  AS user_name,
        u.image AS user_image,
        t.title AS trek_title,
        t.slug  AS trek_slug,
        tl.name AS leader_name
      FROM reviews r
      LEFT JOIN "user" u  ON u.id  = r.user_id
      LEFT JOIN treks t   ON t.id  = r.trek_id
      LEFT JOIN trek_leaders tl ON tl.id = r.trek_leader_id
      WHERE r.vendor_id = ${vendorId} AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
  ]);

  const agg = aggregateRows[0];
  const total = agg?.total_reviews ?? 0;

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  return {
    aggregate: {
      total_reviews: total,
      avg_rating: agg?.avg_rating ?? null,
      avg_guide_expertise: agg?.avg_guide_expertise ?? null,
      avg_safety_protocols: agg?.avg_safety_protocols ?? null,
      avg_logistics_gear: agg?.avg_logistics_gear ?? null,
      avg_sustainability: agg?.avg_sustainability ?? null,
    },
    reviews: reviewRows.map((r) => ({
      id: r.id.toString(),
      rating: r.rating,
      title: r.title,
      body: r.body,
      photos: buildImageGallery(r.photos),
      guide_expertise: r.guide_expertise,
      safety_protocols: r.safety_protocols,
      logistics_gear: r.logistics_gear,
      sustainability: r.sustainability,
      helpful_count: r.helpful_count,
      not_helpful_count: r.not_helpful_count,
      created_at: r.created_at.toISOString(),
      user: {
        name: r.user_name,
        image: buildImageUrl(r.user_image),
      },
      trek: r.trek_title
        ? { title: r.trek_title, slug: r.trek_slug }
        : null,
      leader_name: r.leader_name,
    })),
    meta,
  };
};

// ─── POST /api/v1/reviews ───────────────────────────────────────────────────────

export interface CreateReviewBody {
  vendor_id: number;
  listing_id: number;
  trek_id: number;
  rating: number;
  trek_leader_id?: number;
  title?: string;
  body?: string;
  photos?: unknown;
  guide_expertise?: number;
  safety_protocols?: number;
  logistics_gear?: number;
  sustainability?: number;
}

interface BookingCheckRaw {
  id: bigint;
}

interface DuplicateCheckRaw {
  id: bigint;
}

export const createReview = async (
  userId: string,
  data: CreateReviewBody,
): Promise<
  | { data: { id: string; status: string; message: string } }
  | { error: string; status: 400 | 403 | 404 }
> => {
  const { vendor_id, listing_id, trek_id, rating } = data;

  if (!vendor_id || !listing_id || !trek_id || rating === undefined || rating === null) {
    return { error: "vendor_id, listing_id, trek_id, and rating are required", status: 400 };
  }

  if (rating < 1 || rating > 5) {
    return { error: "rating must be between 1 and 5", status: 400 };
  }

  const vendorBigInt = BigInt(vendor_id);
  const listingBigInt = BigInt(listing_id);
  const trekBigInt = BigInt(trek_id);

  // Verify user has a completed booking with this vendor
  const bookingRows = await prisma.$queryRaw<BookingCheckRaw[]>`
    SELECT b.id
    FROM bookings b
    INNER JOIN trek_listings tl ON tl.id = b.listing_id
    WHERE b.user_id = ${userId}
      AND tl.vendor_id = ${vendorBigInt}
      AND b.status = 'completed'
    LIMIT 1
  `;

  if (!bookingRows.length) {
    return {
      error: "You can only review vendors you have trekked with",
      status: 403,
    };
  }

  // Check for duplicate review on same listing
  const duplicateRows = await prisma.$queryRaw<DuplicateCheckRaw[]>`
    SELECT id
    FROM reviews
    WHERE user_id = ${userId}
      AND listing_id = ${listingBigInt}
    LIMIT 1
  `;

  if (duplicateRows.length) {
    return { error: "You have already reviewed this listing", status: 400 };
  }

  const review = await prisma.reviews.create({
    data: {
      vendor_id: vendorBigInt,
      listing_id: listingBigInt,
      trek_id: trekBigInt,
      user_id: userId,
      rating: data.rating,
      ...(data.trek_leader_id !== undefined
        ? { trek_leader_id: BigInt(data.trek_leader_id) }
        : {}),
      title: data.title ?? null,
      body: data.body ?? null,
      photos: data.photos !== undefined ? (data.photos as never) : undefined,
      guide_expertise: data.guide_expertise ?? null,
      safety_protocols: data.safety_protocols ?? null,
      logistics_gear: data.logistics_gear ?? null,
      sustainability: data.sustainability ?? null,
      status: "published",
    },
    select: { id: true, status: true },
  });

  return {
    data: {
      id: review.id.toString(),
      status: review.status,
      message: "Review submitted successfully",
    },
  };
};

// ─── POST /api/v1/reviews/:id/helpful ──────────────────────────────────────────

export const markHelpful = async (
  reviewId: bigint,
  type: string,
): Promise<
  | { message: string }
  | { error: string; status: 400 | 404 }
> => {
  if (type !== "helpful" && type !== "not_helpful") {
    return { error: 'type must be "helpful" or "not_helpful"', status: 400 };
  }

  const result = await prisma.reviews.updateMany({
    where: { id: reviewId },
    data:
      type === "helpful"
        ? { helpful_count: { increment: 1 } }
        : { not_helpful_count: { increment: 1 } },
  });

  if (result.count === 0) {
    return { error: "Review not found", status: 404 };
  }

  return { message: type === "helpful" ? "Marked as helpful" : "Marked as not helpful" };
};
