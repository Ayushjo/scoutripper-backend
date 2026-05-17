import prisma from "../utils/db";
import { TrekFilters } from "../types/trek.types";
import { ListingSummary, TrekLeaderSummary, NextSlot } from "../types/listing.types";
import { buildImageUrl } from "../utils/image";


interface TrekRaw {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  price: number | null;
  sale_price: number | null;
  duration: bigint | null;
  altitude: string | null;
  location_name: string;
  location_slug: string;
}

interface CountRaw {
  count: bigint;
}


function serializeTrekRaw(r: TrekRaw) {
  return {
    id: r.id.toString(),
    title: r.title,
    slug: r.slug,
    bannerImage: buildImageUrl(r.banner_image),
    price: r.price,
    salePrice: r.sale_price,
    duration: r.duration?.toString() ?? null,
    altitude: r.altitude,
    location: {
      name: r.location_name,
      slug: r.location_slug,
    },
  };
}


interface TrekListRaw {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  price: number | null;
  sale_price: number | null;
  duration: bigint | null;
  altitude: string | null;
  total_distance: string | null;
  is_featured: string | null;
  status: string | null;
  review_score: string | null;
  created_at: Date | null;
  location_id: bigint | null;
  location_name: string | null;
  location_slug: string | null;
  category_id: bigint | null;
  category_name: string | null;
  category_slug: string | null;
}

function serializeTrekList(r: TrekListRaw) {
  return {
    id: r.id.toString(),
    title: r.title,
    slug: r.slug,
    bannerImage: buildImageUrl(r.banner_image),
    price: r.price,
    salePrice: r.sale_price,
    duration: r.duration?.toString() ?? null,
    altitude: r.altitude,
    totalDistance: r.total_distance,
    isFeatured: r.is_featured,
    status: r.status,
    reviewScore: r.review_score,
    location: r.location_id
      ? { id: r.location_id.toString(), name: r.location_name, slug: r.location_slug }
      : null,
    category: r.category_id
      ? { id: r.category_id.toString(), name: r.category_name, slug: r.category_slug }
      : null,
  };
}

export const getAllTreks = async (filters: TrekFilters) => {
  const {
    status = "publish",
    categoryId,
    isFeatured,
    minPrice,
    maxPrice,
    duration,
    difficulty,
    location,
    category,
    season,
    sort = "newest",
    page = 1,
    limit = 10,
  } = filters;

  const skip = (page - 1) * limit;
  const params: (string | number | bigint)[] = [];
  let n = 1;

  const push = (v: string | number | bigint): string => {
    params.push(v);
    return `$${n++}`;
  };

  const conds: string[] = [
    "t.deleted_at IS NULL",
    `t.status = ${push(status)}`,
  ];

  const joins: string[] = [
    "LEFT JOIN locations l ON l.id = t.location_id",
    "LEFT JOIN destination_category dc ON dc.id = t.category_id",
  ];

  if (categoryId !== undefined) conds.push(`t.category_id = ${push(BigInt(categoryId))}`);
  if (isFeatured !== undefined) conds.push(`t.is_featured = ${push(isFeatured)}`);
  if (minPrice !== undefined) conds.push(`t.price >= ${push(minPrice)}`);
  if (maxPrice !== undefined) conds.push(`t.price <= ${push(maxPrice)}`);
  if (duration !== undefined) conds.push(`t.duration = ${push(BigInt(duration * 24))}`);

  if (location) {
    conds.push(
      `l.path <@ (SELECT path FROM locations WHERE slug = ${push(location)} AND deleted_at IS NULL LIMIT 1)`,
    );
  }

  for (const [alias, val] of [
    ["diff", difficulty],
    ["cat", category],
    ["sea", season],
  ] as [string, string | undefined][]) {
    if (val) {
      joins.push(
        `JOIN trek_attributes ta${alias} ON ta${alias}.trek_id = t.id`,
        `JOIN attributes a${alias} ON a${alias}.id = ta${alias}.attributes_id AND a${alias}.slug = ${push(val)}`,
      );
    }
  }

  const orderByMap: Record<string, string> = {
    price_asc: "t.price ASC NULLS LAST",
    price_desc: "t.price DESC NULLS LAST",
    duration_asc: "t.duration ASC NULLS LAST",
    newest: "t.created_at DESC",
  };
  const orderBy = orderByMap[sort] ?? "t.created_at DESC";

  const joinStr = joins.join("\n");
  const whereStr = `WHERE ${conds.join(" AND ")}`;

  const dataSql = `
    SELECT DISTINCT
      t.id, t.title, t.slug, t.banner_image, t.price, t.sale_price,
      t.duration, t.altitude, t.total_distance, t.is_featured,
      t.status, t.review_score, t.created_at,
      l.id   AS location_id, l.name AS location_name, l.slug AS location_slug,
      dc.id  AS category_id, dc.name AS category_name, dc.slug AS category_slug
    FROM treks t
    ${joinStr}
    ${whereStr}
    ORDER BY ${orderBy}
    LIMIT ${push(limit)} OFFSET ${push(skip)}
  `;

  const countSql = `
    SELECT COUNT(DISTINCT t.id)::bigint AS count
    FROM treks t
    ${joinStr}
    ${whereStr}
  `;

  const baseParams = params.slice(0, -2);

  const [treks, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<TrekListRaw[]>(dataSql, ...params),
    prisma.$queryRawUnsafe<CountRaw[]>(countSql, ...baseParams),
  ]);

  return { treks: treks.map(serializeTrekList), total: Number(countResult[0]?.count ?? 0) };
};


interface ListingStatsRaw {
  min_price: number | null;
  listing_count: number;
  leader_count: number;
  routes_count: number;
}

interface ExpeditionLeaderRaw {
  id: bigint;
  name: string;
  image: string | null;
  rating: number | null;
  certifications: unknown;
}

interface ListingRaw {
  id: bigint;
  title: string;
  route_name: string | null;
  tags: unknown;
  price: number | null;
  sale_price: number | null;
  duration_days: number | null;
  difficulty: string | null;
  meeting_point: string | null;
  cancellation_policy: string | null;
  is_popular: boolean;
  vendor_id: bigint;
  vendor_name: string;
  vendor_logo: string | null;
  vendor_is_verified: boolean;
  leader_id: bigint | null;
  leader_name: string | null;
  leader_image: string | null;
  leader_rating: number | null;
  leader_experience_years: number | null;
  leader_certifications: unknown;
  slot_id: bigint | null;
  slot_start_date: Date | null;
  slot_end_date: Date | null;
  slot_available_seats: number | null;
  slot_status: string | null;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function buildImageGallery(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => (typeof item === "string" ? buildImageUrl(item) : item));
}

function transformRouteDays(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformRouteDays(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        key === "image" && typeof val === "string"
          ? buildImageUrl(val)
          : transformRouteDays(val),
      ]),
    );
  }

  return value;
}

function serializeListingRaw(r: ListingRaw): ListingSummary {
  const leader: TrekLeaderSummary | null = r.leader_id
    ? {
        id: r.leader_id.toString(),
        name: r.leader_name!,
        image: r.leader_image,
        rating: r.leader_rating,
        experience_years: r.leader_experience_years,
        certifications: r.leader_certifications,
      }
    : null;

  const next_slot: NextSlot | null = r.slot_id
    ? {
        id: r.slot_id.toString(),
        start_date: formatDate(r.slot_start_date!),
        end_date: formatDate(r.slot_end_date!),
        available_seats: r.slot_available_seats!,
        status: r.slot_status!,
      }
    : null;

  return {
    id: r.id.toString(),
    title: r.title,
    route_name: r.route_name,
    tags: r.tags,
    price: r.price,
    sale_price: r.sale_price,
    duration_days: r.duration_days,
    difficulty: r.difficulty,
    meeting_point: r.meeting_point,
    cancellation_policy: r.cancellation_policy,
    is_popular: r.is_popular,
    vendor: {
      id: r.vendor_id.toString(),
      name: r.vendor_name,
      logo: r.vendor_logo,
      is_verified: r.vendor_is_verified,
    },
    trek_leader: leader,
    next_slot,
  };
}

export const getTrekBySlug = async (slug: string) => {
  const trek = await prisma.trek.findUnique({
    where: { slug },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
          mapLat: true,
          mapLng: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          catIcon: true,
        },
      },
      attributes: {
        include: {
          attribute: {
            select: {
              id: true,
              name: true,
              icon: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!trek) return null;

  const [statsResult, expeditionTeamRaw] = await Promise.all([
    prisma.$queryRaw<ListingStatsRaw[]>`
      SELECT
        MIN(price)::float8 as min_price,
        COUNT(*)::int4 as listing_count,
        COUNT(DISTINCT trek_leader_id)::int4 as leader_count,
        (
          SELECT COUNT(*)::int4
          FROM trek_routes
          WHERE trek_id = ${trek.id}
        ) as routes_count
      FROM trek_listings
      WHERE trek_id = ${trek.id} AND status = 'active'
    `,
    prisma.$queryRaw<ExpeditionLeaderRaw[]>`
      SELECT DISTINCT tl.id, tl.name, tl.image, tl.rating, tl.certifications
      FROM trek_leaders tl
      JOIN trek_listings tll ON tll.trek_leader_id = tl.id
      WHERE tll.trek_id = ${trek.id} AND tll.status = 'active'
      ORDER BY tl.id ASC
      LIMIT 5
    `,
  ]);

  const stats = statsResult[0];

  return {
    ...trek,
    bannerImage: buildImageUrl(trek.bannerImage),
    gallery: buildImageGallery(trek.gallery),
    featureImages: buildImageGallery(trek.featureImages),
    min_price: stats?.min_price ?? null,
    listing_count: stats?.listing_count ?? 0,
    leader_count: stats?.leader_count ?? 0,
    routes_count: stats?.routes_count ?? 0,
    expedition_team: expeditionTeamRaw.map((l) => ({
      id: l.id.toString(),
      name: l.name,
      image: buildImageUrl(l.image),
      rating: l.rating,
      certifications: l.certifications,
    })),
  };
};

export const getTrekListings = async (slug: string): Promise<ListingSummary[] | null> => {
  const trek = await prisma.trek.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!trek) return null;

  const listings = await prisma.$queryRaw<ListingRaw[]>`
    SELECT
      tl.id,
      tl.title,
      tl.route_name,
      tl.tags,
      tl.price,
      tl.sale_price,
      tl.duration_days,
      tl.difficulty,
      tl.meeting_point,
      tl.cancellation_policy,
      tl.is_popular,
      v.id    AS vendor_id,
      v.name  AS vendor_name,
      v.logo  AS vendor_logo,
      v.is_verified AS vendor_is_verified,
      ldr.id              AS leader_id,
      ldr.name            AS leader_name,
      ldr.image           AS leader_image,
      ldr.rating          AS leader_rating,
      ldr.experience_years AS leader_experience_years,
      ldr.certifications  AS leader_certifications,
      ns.id               AS slot_id,
      ns.start_date       AS slot_start_date,
      ns.end_date         AS slot_end_date,
      ns.available_seats  AS slot_available_seats,
      ns.status           AS slot_status
    FROM trek_listings tl
    JOIN vendors v ON v.id = tl.vendor_id
    LEFT JOIN trek_leaders ldr ON ldr.id = tl.trek_leader_id
    LEFT JOIN LATERAL (
      SELECT id, start_date, end_date, available_seats, status
      FROM trek_slots
      WHERE listing_id = tl.id
        AND status = 'open'
        AND start_date >= CURRENT_DATE
      ORDER BY start_date ASC
      LIMIT 1
    ) ns ON true
    WHERE tl.trek_id = ${trek.id} AND tl.status = 'active'
    ORDER BY tl.is_popular DESC, tl.id ASC
  `;

  return listings.map(serializeListingRaw);
};


export const getTrekBreadcrumb = async (slug: string) => {
  const trek = await prisma.trek.findUnique({
    where: { slug },
    select: {
      title: true,
      slug: true,
      location: {
        select: { id: true },
      },
    },
  });

  if (!trek || !trek.location) return null;

  const locationId = trek.location.id;

  interface BreadcrumbRaw {
    id: bigint;
    name: string;
    slug: string;
    path: string;
  }

  const breadcrumb = await prisma.$queryRaw<BreadcrumbRaw[]>`
    SELECT id, name, slug, path::text as path
    FROM locations
    WHERE path @> (
      SELECT path FROM locations WHERE id = ${locationId}
    )
    AND deleted_at IS NULL
    ORDER BY nlevel(path) ASC
  `;

  return {
    trek: { title: trek.title, slug: trek.slug },
    breadcrumb: breadcrumb.map((b:any) => ({
      id: b.id.toString(),
      name: b.name,
      slug: b.slug,
      path: b.path,
    })),
  };
};

export const getRelatedTreks = async (slug: string, limit: number = 6) => {
  const trek = await prisma.trek.findUnique({
    where: { slug },
    select: {
      id: true,
      location: {
        select: { id: true },
      },
    },
  });

  if (!trek || !trek.location) return [];

  const trekId = trek.id;
  const locationId = trek.location.id;

  const related = await prisma.$queryRaw<TrekRaw[]>`
    SELECT 
      t.id,
      t.title,
      t.slug,
      t.banner_image,
      t.price,
      t.sale_price,
      t.duration,
      t.altitude,
      l.name as location_name,
      l.slug as location_slug
    FROM treks t
    JOIN locations l ON t.location_id = l.id
    WHERE l.path <@ (
      SELECT path FROM locations WHERE id = ${locationId}
    )
    AND t.id != ${trekId}
    AND t.status = 'publish'
    AND t.deleted_at IS NULL
    LIMIT ${limit}
  `;

  return related.map(serializeTrekRaw);
};


export const getTreksByLocation = async (
  locationSlug: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const location = await prisma.location.findUnique({
    where: { slug: locationSlug },
    select: { id: true, name: true },
  });

  if (!location) return null;

  const locationId = location.id;

  const [treks, countResult] = await Promise.all([
    prisma.$queryRaw<TrekRaw[]>`
      SELECT 
        t.id,
        t.title,
        t.slug,
        t.banner_image,
        t.price,
        t.sale_price,
        t.duration,
        t.altitude,
        l.name as location_name,
        l.slug as location_slug
      FROM treks t
      JOIN locations l ON t.location_id = l.id
      WHERE l.path <@ (
        SELECT path FROM locations WHERE id = ${locationId}
      )
      AND t.status = 'publish'
      AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<CountRaw[]>`
      SELECT COUNT(*)::bigint as count
      FROM treks t
      JOIN locations l ON t.location_id = l.id
      WHERE l.path <@ (
        SELECT path FROM locations WHERE id = ${locationId}
      )
      AND t.status = 'publish'
      AND t.deleted_at IS NULL
    `,
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    location: { name: location.name, slug: locationSlug },
    treks: treks.map(serializeTrekRaw),
    total,
  };
};

export const getFeaturedTreks = async (limit: number = 6) => {
  const treks = await prisma.trek.findMany({
    where: {
      isFeatured: "yes",
      status: "publish",
      deletedAt: null,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      bannerImage: true,
      price: true,
      salePrice: true,
      duration: true,
      altitude: true,
      totalDistance: true,
      reviewScore: true,
      location: {
        select: {
          name: true,
          slug: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  return treks.map((trek) => ({
    ...trek,
    bannerImage: buildImageUrl(trek.bannerImage),
  }));
};

export const getTrekRoutes = async (slug: string) => {
  const trek = await prisma.trek.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!trek) return null;

  const routes = await prisma.trek_routes.findMany({
    where: { trek_id: trek.id },
    orderBy: [{ is_popular: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      distance_km: true,
      difficulty: true,
      is_popular: true,
      days: true,
    },
  });

  return routes.map((route) => ({
    id: route.id.toString(),
    name: route.name,
    distance_km: route.distance_km,
    difficulty: route.difficulty,
    is_popular: route.is_popular ?? false,
    days: transformRouteDays(route.days),
  }));
};
