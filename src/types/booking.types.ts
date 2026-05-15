export interface CreateBookingBody {
  listing_id: number;
  slot_id: number;
  adult_count: number;
  children_count: number;
  special_request?: string;
}

export interface BookingVendor {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
}

export interface BookingListingRef {
  id: string;
  title: string;
  route_name: string | null;
  difficulty: string | null;
  meeting_point: string | null;
  vendor: BookingVendor;
}

export interface BookingSlotRef {
  id: string;
  start_date: string;
  end_date: string;
  total_seats: number;
  available_seats: number;
  status: string;
}

export interface BookingTrekRef {
  id: string;
  title: string;
  slug: string;
  banner_image: string | null;
}

export interface BookingResponse {
  id: string;
  item_name: string | null;
  item_type: string | null;
  status: string | null;
  amount_paid: number | null;
  adult_count: number;
  children_count: number;
  scheduled_on: string | null;
  created_at: string | null;
  special_request: string | null;
  listing: BookingListingRef | null;
  slot: BookingSlotRef | null;
}

export interface BookingDetailResponse extends BookingResponse {
  trek: BookingTrekRef | null;
}
