import prisma from "../utils/db";
import { PaginationMeta } from "../types/trek.types";

interface CategoryRaw {
  id: bigint;
  name: string;
  slug: string;
  cat_icon: string | null;
  trek_count: number;
}

interface TrekByCategoryRaw {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  price: number | null;
  sale_price: number | null;
  duration: bigint | null;
  altitude: string | null;
  total_distance: string | null;
  review_score: string | null;
  location_name: string | null;
  location_slug: string | null;
}

interface CountRaw {
  count: bigint;
}

export const getCategories = async () => {
  const rows = await prisma.$queryRaw<CategoryRaw[]>`
    SELECT
      dc.id,
      dc.name,
      dc.slug,
      dc.cat_icon,
      (
        SELECT COUNT(*)::int
        FROM treks t
        WHERE t.category_id = dc.id
          AND t.status = 'publish'
          AND t.deleted_at IS NULL
      ) AS trek_count
    FROM destination_category dc
    WHERE dc.status = 'publish'
    ORDER BY dc.name ASC
  `;

  return rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    cat_icon: r.cat_icon,
    trek_count: r.trek_count,
  }));
};

export const getTreksByCategory = async (
  slug: string,
  page: number = 1,
  limit: number = 10,
): Promise<{ treks: ReturnType<typeof serializeTrekByCategory>[]; total: number; meta: PaginationMeta } | null> => {
  const skip = (page - 1) * limit;

  const [treks, countResult] = await Promise.all([
    prisma.$queryRaw<TrekByCategoryRaw[]>`
      SELECT
        t.id, t.title, t.slug, t.banner_image, t.price, t.sale_price,
        t.duration, t.altitude, t.total_distance, t.review_score,
        l.name AS location_name, l.slug AS location_slug
      FROM treks t
      JOIN destination_category dc ON dc.id = t.category_id
        AND dc.slug = ${slug}
      LEFT JOIN locations l ON l.id = t.location_id
      WHERE t.status = 'publish'
        AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<CountRaw[]>`
      SELECT COUNT(*)::bigint AS count
      FROM treks t
      JOIN destination_category dc ON dc.id = t.category_id
        AND dc.slug = ${slug}
      WHERE t.status = 'publish'
        AND t.deleted_at IS NULL
    `,
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  return { treks: treks.map(serializeTrekByCategory), total, meta };
};

function serializeTrekByCategory(r: TrekByCategoryRaw) {
  return {
    id: r.id.toString(),
    title: r.title,
    slug: r.slug,
    bannerImage: r.banner_image,
    price: r.price,
    salePrice: r.sale_price,
    duration: r.duration?.toString() ?? null,
    altitude: r.altitude,
    totalDistance: r.total_distance,
    reviewScore: r.review_score,
    location: r.location_name
      ? { name: r.location_name, slug: r.location_slug }
      : null,
  };
}
