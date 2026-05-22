import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";

interface WishlistTrekRaw {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  price: number | null;
  sale_price: number | null;
  duration: bigint | null;
  altitude: string | null;
  location_name: string | null;
  location_slug: string | null;
}

interface WishlistExpRaw {
  id: bigint;
  title: string;
  slug: string;
  banner_image: string | null;
  price: number | null;
  sale_price: number | null;
  duration: bigint | null;
}

export const getWishlist = async (userId: string) => {
  const items = await prisma.wishlist.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  if (!items.length) return [];

  const trekIds = items
    .filter((i) => i.item_type === "trek" && i.item_id)
    .map((i) => i.item_id!);

  const expIds = items
    .filter((i) => i.item_type === "experience" && i.item_id)
    .map((i) => i.item_id!);

  const [treks, experiences] = await Promise.all([
    trekIds.length
      ? prisma.$queryRaw<WishlistTrekRaw[]>`
          SELECT
            t.id, t.title, t.slug, t.banner_image, t.price, t.sale_price,
            t.duration, t.altitude,
            l.name AS location_name, l.slug AS location_slug
          FROM treks t
          LEFT JOIN locations l ON l.id = t.location_id
          WHERE t.id = ANY(${trekIds}::bigint[])
        `
      : Promise.resolve([] as WishlistTrekRaw[]),
    expIds.length
      ? prisma.$queryRaw<WishlistExpRaw[]>`
          SELECT id, title, slug, banner_image, price, sale_price, duration
          FROM experiences
          WHERE id = ANY(${expIds}::bigint[])
        `
      : Promise.resolve([] as WishlistExpRaw[]),
  ]);

  const trekMap = new Map(treks.map((t) => [t.id.toString(), t]));
  const expMap = new Map(experiences.map((e) => [e.id.toString(), e]));

  return items.map((item) => {
    const key = item.item_id?.toString() ?? "";

    const itemData =
      item.item_type === "trek"
        ? trekMap.get(key)
        : expMap.get(key);

    if (!itemData) {
      return {
        id: item.id.toString(),
        item_type: item.item_type,
        item_id: item.item_id?.toString() ?? null,
        item_slug: item.item_slug,
        created_at: item.created_at?.toISOString() ?? null,
        data: null,
      };
    }

    const base = {
      id: itemData.id.toString(),
      title: itemData.title,
      slug: itemData.slug,
      banner_image: buildImageUrl(itemData.banner_image),
      price: itemData.price,
      sale_price: itemData.sale_price,
      duration: itemData.duration?.toString() ?? null,
    };

    const data =
      item.item_type === "trek"
        ? {
            ...base,
            altitude: (itemData as WishlistTrekRaw).altitude,
            location: (itemData as WishlistTrekRaw).location_name
              ? {
                  name: (itemData as WishlistTrekRaw).location_name,
                  slug: (itemData as WishlistTrekRaw).location_slug,
                }
              : null,
          }
        : base;

    return {
      id: item.id.toString(),
      item_type: item.item_type,
      item_id: item.item_id?.toString() ?? null,
      item_slug: item.item_slug,
      created_at: item.created_at?.toISOString() ?? null,
      data,
    };
  });
};

export const addToWishlist = async (
  userId: string,
  itemType: string,
  itemId: number,
  itemSlug: string,
) => {
  const existing = await prisma.wishlist.findFirst({
    where: { user_id: userId, item_type: itemType, item_id: BigInt(itemId) },
  });

  if (existing) {
    return { error: "Already in wishlist", status: 400 as const };
  }

  const item = await prisma.wishlist.create({
    data: {
      user_id: userId,
      item_type: itemType,
      item_id: BigInt(itemId),
      item_slug: itemSlug,
    },
  });

  return {
    data: {
      id: item.id.toString(),
      item_type: item.item_type,
      item_id: item.item_id?.toString() ?? null,
      item_slug: item.item_slug,
      created_at: item.created_at?.toISOString() ?? null,
    },
  };
};

export const removeFromWishlist = async (
  id: bigint,
  userId: string,
): Promise<{ error: string; status: 404 | 403 } | { success: true }> => {
  // Step 1: check the item exists at all
  const item = await prisma.wishlist.findUnique({ where: { id } });

  if (!item) {
    return { error: "Wishlist item not found", status: 404 };
  }

  // Step 2: check ownership
  if (item.user_id !== userId) {
    return { error: "Forbidden — this wishlist item belongs to another user", status: 403 };
  }

  await prisma.wishlist.delete({ where: { id } });
  return { success: true };
};
