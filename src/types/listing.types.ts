export interface VendorSummary {
  id: string;
  name: string;
  logo: string | null;
  is_verified: boolean;
}

export interface VendorDetail {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  is_verified: boolean;
  phone: string | null;
  email: string | null;
}

export interface TrekLeaderSummary {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  experience_years: number | null;
  certifications: unknown;
}

export interface TrekLeaderDetail {
  id: string;
  name: string;
  image: string | null;
  experience_years: number | null;
  certifications: unknown;
  bio: string | null;
  rating: number | null;
  review_count: number;
}

export interface NextSlot {
  id: string;
  start_date: string;
  end_date: string;
  available_seats: number;
  status: string;
}

export interface ListingSummary {
  id: string;
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
  vendor: VendorSummary;
  trek_leader: TrekLeaderSummary | null;
  next_slot: NextSlot | null;
}

export interface SlotDetail {
  id: string;
  start_date: string;
  end_date: string;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  status: string;
}

export interface TrekImages {
  banner: string | null;
  gallery: unknown;
  feature_images: unknown;
}

export interface TrekDetail {
  id: string;
  title: string;
  slug: string;
  altitude: string | null;
  difficulty: string | null;
  reviewScore: string | null;
}

export interface ListingDetail {
  id: string;
  title: string;
  tags: unknown;
  route_name: string | null;
  price: number | null;
  sale_price: number | null;
  duration_days: number | null;
  distance_km: string | null;
  elevation_gain: string | null;
  ascent_time: string | null;
  descent_time: string | null;
  difficulty: string | null;
  meeting_point: string | null;
  intro_text: string | null;
  itinerary: unknown;
  inclusions: unknown;
  exclusions: unknown;
  highlights: unknown;
  things_to_carry: unknown;
  cancellation_policy: string | null;
  is_popular: boolean;
  status: string | null;
  trek_images: TrekImages;
  vendor: VendorDetail;
  trek_leader: TrekLeaderDetail | null;
  trek: TrekDetail | null;
  slots: SlotDetail[];
}
