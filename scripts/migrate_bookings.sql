ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS listing_id bigint,
  ADD COLUMN IF NOT EXISTS user_id    text;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings (listing_id);
