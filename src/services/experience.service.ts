import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";
import { PaginationMeta } from "../types/trek.types";

type ExperienceFilters = {
  status?: string;
  isFeatured?: string;
  page: number;
  limit: number;
};

type ExperienceListItem = {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  feature_images: unknown;
  gallery: unknown;
  locations: { id: bigint; name: string; slug: string } | null;
};

type ExperienceAttributeRow = {
  id: bigint;
  name: string;
  slug: string;
  attrId: bigint | null;
  category_name: string | null;
  category_slug: string | null;
};

type ExperienceLocationRaw = {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  feature_images: unknown;
  gallery: unknown;
  location_id: bigint | null;
  location_name: string | null;
  location_slug: string | null;
};

function buildImageList(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => (typeof item === "string" ? buildImageUrl(item) : item));
}

function serializeExperienceList(exp: ExperienceListItem) {
  return {
    id: exp.id.toString(),
    title: exp.title,
    slug: exp.slug,
    banner_image: buildImageUrl(exp.banner_image),
    feature_images: buildImageList(exp.feature_images),
    gallery: buildImageList(exp.gallery),
    location: exp.locations
      ? {
          id: exp.locations.id.toString(),
          name: exp.locations.name,
          slug: exp.locations.slug,
        }
      : null,
  };
}

function serializeExperienceLocationRaw(exp: ExperienceLocationRaw) {
  return {
    id: exp.id.toString(),
    title: exp.title,
    slug: exp.slug,
    banner_image: buildImageUrl(exp.banner_image),
    feature_images: buildImageList(exp.feature_images),
    gallery: buildImageList(exp.gallery),
    location: exp.location_id
      ? {
          id: exp.location_id.toString(),
          name: exp.location_name,
          slug: exp.location_slug,
        }
      : null,
  };
}

function groupAttributes(rows: ExperienceAttributeRow[]) {
  const grouped = new Map<string, { name: string; slug: string; attributes: { id: string; name: string; slug: string }[] }>();

  for (const row of rows) {
    if (!row.category_slug || !row.category_name) continue;
    const existing = grouped.get(row.category_slug);
    const payload = { id: row.id.toString(), name: row.name, slug: row.slug };

    if (!existing) {
      grouped.set(row.category_slug, {
        name: row.category_name,
        slug: row.category_slug,
        attributes: [payload],
      });
    } else {
      existing.attributes.push(payload);
    }
  }

  return Array.from(grouped.values());
}

export const getExperiences = async (filters: ExperienceFilters) => {
  const { status = "publish", isFeatured, page, limit } = filters;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    status,
    ...(isFeatured !== undefined ? { is_featured: isFeatured } : {}),
  };

  const [experiences, countRows] = await Promise.all([
    prisma.experiences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        banner_image: true,
        feature_images: true,
        gallery: true,
        locations: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.experiences.count({ where }),
  ]);

  const total = countRows;

  return {
    experiences: experiences.map(serializeExperienceList),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    } satisfies PaginationMeta,
  };
};

export const getFeaturedExperiences = async () => {
  const experiences = await prisma.experiences.findMany({
    where: {
      is_featured: "yes",
      status: "publish",
      deleted_at: null,
    },
    take: 6,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      banner_image: true,
      feature_images: true,
      gallery: true,
      locations: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return experiences.map(serializeExperienceList);
};

export const getExperienceBySlug = async (slug: string) => {
  const exp = await prisma.experiences.findUnique({
    where: { slug },
    include: {
      locations: {
        select: {
          id: true,
          name: true,
          slug: true,
          mapLat: true,
          mapLng: true,
        },
      },
      experience_attributes: {
        include: {
          attributes: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: {
                select: {
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

  if (!exp) return null;

  return {
    ...exp,
    banner_image: buildImageUrl(exp.banner_image),
    feature_images: buildImageList(exp.feature_images),
    gallery: buildImageList(exp.gallery),
    location: exp.locations
      ? {
          id: exp.locations.id.toString(),
          name: exp.locations.name,
          slug: exp.locations.slug,
          map_lat: exp.locations.mapLat,
          map_lng: exp.locations.mapLng,
        }
      : null,
    attributes: groupAttributes(
      exp.experience_attributes.map((item) => ({
        id: item.attributes.id,
        name: item.attributes.name,
        slug: item.attributes.slug,
        attrId: item.attributes.category ? null : item.attributes.id,
        category_name: item.attributes.category?.name ?? null,
        category_slug: item.attributes.category?.slug ?? null,
      })),
    ),
  };
};

export const getExperiencesByLocation = async (locationSlug: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const locationRows = await prisma.$queryRaw<{ id: bigint; path: string; name: string; slug: string }[]>`
    SELECT id, path::text AS path, name, slug
    FROM locations
    WHERE slug = ${locationSlug}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const location = locationRows[0];
  if (!location) return null;

  const [experiences, countRows] = await Promise.all([
    prisma.$queryRaw<ExperienceLocationRaw[]>`
      SELECT
        e.id,
        e.title,
        e.slug,
        e.banner_image,
        e.feature_images,
        e.gallery,
        l.id AS location_id,
        l.name AS location_name,
        l.slug AS location_slug
      FROM experiences e
      JOIN locations l ON l.id = e.location_id
      WHERE l.path <@ ${location.path}::ltree
        AND e.deleted_at IS NULL
        AND e.status = 'publish'
      ORDER BY e.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM experiences e
      JOIN locations l ON l.id = e.location_id
      WHERE l.path <@ ${location.path}::ltree
        AND e.deleted_at IS NULL
        AND e.status = 'publish'
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    location: { name: location.name, slug: location.slug },
    experiences: experiences.map(serializeExperienceLocationRaw),
    total,
  };
};
