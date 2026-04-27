import prisma from "../utils/db";
import { ListingDetail, SlotDetail } from "../types/listing.types";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export const getListingById = async (id: bigint): Promise<ListingDetail | null> => {
  const listing = await prisma.trek_listings.findUnique({
    where: { id },
    include: {
      vendors: {
        select: {
          id: true,
          name: true,
          logo: true,
          description: true,
          is_verified: true,
          phone: true,
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
          bannerImage: true,
        },
      },
      trek_slots: {
        where: {
          start_date: { gte: new Date() },
          status: { in: ["open", "full"] },
        },
        orderBy: { start_date: "asc" },
        select: {
          id: true,
          start_date: true,
          end_date: true,
          total_seats: true,
          available_seats: true,
          booked_seats: true,
          status: true,
        },
      },
    },
  });

  if (!listing || !listing.vendors) return null;

  const slots: SlotDetail[] = listing.trek_slots.map((s) => ({
    id: s.id.toString(),
    start_date: formatDate(s.start_date),
    end_date: formatDate(s.end_date),
    total_seats: s.total_seats,
    available_seats: s.available_seats,
    booked_seats: s.booked_seats ?? 0,
    status: s.status ?? "open",
  }));

  return {
    id: listing.id.toString(),
    title: listing.title,
    tags: listing.tags,
    route_name: listing.route_name,
    price: listing.price,
    sale_price: listing.sale_price,
    duration_days: listing.duration_days,
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
    cancellation_policy: listing.cancellation_policy,
    is_popular: listing.is_popular ?? false,
    vendor: {
      id: listing.vendors.id.toString(),
      name: listing.vendors.name,
      logo: listing.vendors.logo,
      description: listing.vendors.description,
      is_verified: listing.vendors.is_verified ?? false,
      phone: listing.vendors.phone,
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
          banner_image: listing.treks.bannerImage,
        }
      : null,
    slots,
  };
};
