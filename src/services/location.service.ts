import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";

interface LocationListRaw {
  id: bigint;
  name: string;
  slug: string;
  banner_image: string | null;
  type: string | null;
  trek_count: number;
}

interface LocationDetailRaw {
  id: bigint;
  name: string;
  slug: string;
  content: unknown;
  image_id: string | null;
  map_lat: number | null;
  map_lng: number | null;
  general_info: unknown;
  gallery: unknown;
  banner_image: string | null;
  type: string | null;
  path_text: string;
}

interface BreadcrumbRaw {
  id: bigint;
  name: string;
  slug: string;
  path: string;
}

interface ChildLocationRaw {
  id: bigint;
  name: string;
  slug: string;
  banner_image: string | null;
  type: string | null;
  trek_count: number;
}

function buildImageGallery(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => (typeof item === "string" ? buildImageUrl(item) : item));
}

export const getLocations = async () => {
  const rows = await prisma.$queryRaw<LocationListRaw[]>`
    SELECT
      l.id,
      l.name,
      l.slug,
      l.banner_image,
      l.type,
      (
        SELECT COUNT(*)::int
        FROM treks t
        JOIN locations l2 ON l2.id = t.location_id
        WHERE l2.path <@ l.path
          AND t.status = 'publish'
          AND t.deleted_at IS NULL
      ) AS trek_count
    FROM locations l
    WHERE nlevel(l.path) <= 2
      AND l.deleted_at IS NULL
    ORDER BY l.name ASC
  `;

  return rows.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    slug: r.slug,
    banner_image: buildImageUrl(r.banner_image),
    type: r.type,
    trek_count: r.trek_count,
  }));
};

export const getLocationBySlug = async (slug: string) => {
  const locationRows = await prisma.$queryRaw<LocationDetailRaw[]>`
    SELECT
      l.id, l.name, l.slug, l.content, l.image_id,
      l.map_lat, l.map_lng, l.general_info, l.gallery,
      l.banner_image, l.type,
      l.path::text AS path_text
    FROM locations l
    WHERE l.slug = ${slug}
      AND l.deleted_at IS NULL
    LIMIT 1
  `;

  if (!locationRows.length) return null;

  const loc = locationRows[0];

  const [breadcrumb, children, trekCountRows] = await Promise.all([
    prisma.$queryRaw<BreadcrumbRaw[]>`
      SELECT id, name, slug, path::text AS path
      FROM locations
      WHERE path @> (SELECT path FROM locations WHERE slug = ${slug} LIMIT 1)
        AND deleted_at IS NULL
      ORDER BY nlevel(path) ASC
    `,
    prisma.$queryRaw<ChildLocationRaw[]>`
      SELECT
        c.id, c.name, c.slug, c.banner_image, c.type,
        (
          SELECT COUNT(*)::int
          FROM treks t
          JOIN locations l2 ON l2.id = t.location_id
          WHERE l2.path <@ c.path
            AND t.status = 'publish'
            AND t.deleted_at IS NULL
        ) AS trek_count
      FROM locations c
      WHERE c.parent_id = ${loc.id}
        AND c.deleted_at IS NULL
      ORDER BY c.name ASC
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM treks t
      JOIN locations l ON l.id = t.location_id
      WHERE l.path <@ ${loc.path_text}::ltree
        AND t.status = 'publish'
        AND t.deleted_at IS NULL
    `,
  ]);

  return {
    id: loc.id.toString(),
    name: loc.name,
    slug: loc.slug,
    content: loc.content,
    image_id: buildImageUrl(loc.image_id),
    map_lat: loc.map_lat,
    map_lng: loc.map_lng,
    general_info: loc.general_info,
    gallery: buildImageGallery(loc.gallery),
    banner_image: buildImageUrl(loc.banner_image),
    type: loc.type,
    trek_count: trekCountRows[0]?.count ?? 0,
    breadcrumb: breadcrumb.map((b) => ({
      id: b.id.toString(),
      name: b.name,
      slug: b.slug,
      path: b.path,
    })),
    children: children.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      slug: c.slug,
      banner_image: buildImageUrl(c.banner_image),
      type: c.type,
      trek_count: c.trek_count,
    })),
  };
};
