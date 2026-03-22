import prisma from "../utils/db";
import { TrekFilters } from "../types/trek.types";


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
    bannerImage: r.banner_image,
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


export const getAllTreks = async (filters: TrekFilters) => {
  const {
    status = "publish",
    categoryId,
    isFeatured,
    minPrice,
    maxPrice,
    duration,
    page = 1,
    limit = 10,
  } = filters;

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
    status,
  };

  if (categoryId) where.categoryId = BigInt(categoryId);
  if (isFeatured) where.isFeatured = isFeatured;
  if (minPrice !== undefined) where.price = { gte: minPrice };
  if (maxPrice !== undefined) where.price = { lte: maxPrice };
  if (duration) where.duration = BigInt(duration);

  const [treks, total] = await Promise.all([
    prisma.trek.findMany({
      where,
      skip,
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
        isFeatured: true,
        status: true,
        reviewScore: true,
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.trek.count({ where }),
  ]);

  return { treks, total };
};


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

  return trek;
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
    breadcrumb: breadcrumb.map((b) => ({
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

  return treks;
};
