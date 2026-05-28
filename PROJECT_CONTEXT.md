# ScoutRipper Backend — Project Context

> Auto-generated on 2026-05-28. Source of truth for all API endpoints, data models, patterns, and file structure.

---

## Table of Contents

1. [API Endpoints](#1-api-endpoints)
2. [Prisma Schema Summary](#2-prisma-schema-summary)
3. [Environment Variables](#3-environment-variables)
4. [Special Patterns & Gotchas](#4-special-patterns--gotchas)
5. [File Structure](#5-file-structure)

---

## 1. API Endpoints

### Auth — `/api/auth/*` (Better-Auth managed)

All routes under `/api/auth/*splat` are handled internally by `better-auth` via `toNodeHandler(auth)`. These are mounted **before** `express.json()`, so the library parses its own body.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/sign-in/email` | Public | Email + password login |
| POST | `/api/auth/sign-up/email` | Public | Register with email |
| POST | `/api/auth/sign-out` | Session | Invalidates session |
| POST | `/api/auth/forget-password` | Public | Sends reset email |
| POST | `/api/auth/reset-password` | Public | Consumes reset token |
| GET/POST | `/api/auth/callback/google` | Public | Google OAuth flow |

---

### Treks — `/api/v1/treks`

**Service file:** `src/services/trek.service.ts`

#### `GET /api/v1/treks`
- **Auth:** Public
- **Query params:**
  - `page` (number, default 1)
  - `limit` (number, default 10)
  - `status` (string, default `"publish"`)
  - `isFeatured` (string, e.g. `"yes"`)
  - `categoryId` (number)
  - `minPrice` / `maxPrice` (number)
  - `duration` (number, in days — internally converted to hours × 24)
  - `difficulty` (string — matched against attribute slug)
  - `location` (string — location slug, uses ltree `<@` ancestry query)
  - `category` (string — attribute slug)
  - `season` (string — attribute slug)
  - `sort` (`"price_asc"` | `"price_desc"` | `"duration_asc"` | `"newest"`, default `"newest"`)
- **Response:**
  ```json
  {
    "success": true,
    "data": [ { "id", "title", "slug", "bannerImage", "price", "salePrice", "duration", "altitude", "totalDistance", "isFeatured", "status", "reviewScore", "location": { "id", "name", "slug" }, "category": { "id", "name", "slug" } } ],
    "meta": { "total", "page", "limit", "totalPages" }
  }
  ```
- **Service:** `TrekService.getAllTreks` — raw SQL via `$queryRawUnsafe`, dynamic WHERE + JOIN construction

---

#### `GET /api/v1/treks/featured`
- **Auth:** Public
- **Query params:** `limit` (number, default 6)
- **Response:** `{ success, data: TrekCard[] }` — same shape as list item, includes `totalDistance`, `reviewScore`, nested `location` and `category`
- **Service:** `TrekService.getFeaturedTreks` — Prisma `findMany` with `isFeatured = "yes"`

---

#### `GET /api/v1/treks/location/:slug`
- **Auth:** Public
- **Path param:** `slug` — location slug
- **Query params:** `page`, `limit`
- **Response:**
  ```json
  { "success": true, "data": { "location": { "name", "slug" }, "treks": [...], "total": 42 }, "meta": { ... } }
  ```
- **Service:** `TrekService.getTreksByLocation` — ltree `<@` query to get all treks in location subtree

---

#### `GET /api/v1/treks/:slug`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** Full trek object including:
  - All trek fields (bannerImage, gallery, featureImages processed through `buildImageUrl`)
  - Nested `location`, `category`, `attributes` (with attribute category)
  - Computed `min_price`, `listing_count`, `leader_count`, `routes_count` from active listings
  - `expedition_team`: up to 5 distinct trek leaders across active listings
- **Service:** `TrekService.getTrekBySlug` — Prisma `findUnique` + 2 raw SQL queries in parallel

---

#### `GET /api/v1/treks/:slug/breadcrumb`
- **Auth:** Public
- **Path param:** `slug`
- **Response:**
  ```json
  { "success": true, "data": { "trek": { "title", "slug" }, "breadcrumb": [ { "id", "name", "slug", "path" } ] } }
  ```
- **Service:** `TrekService.getTrekBreadcrumb` — ltree `@>` query to find all ancestors

---

#### `GET /api/v1/treks/:slug/routes`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** `{ success, data: Route[] }` where each route has `id`, `name`, `distance_km`, `difficulty`, `is_popular`, `days` (nested images processed via `transformRouteDays`)
- **Service:** `TrekService.getTrekRoutes`

---

#### `GET /api/v1/treks/:slug/nearby-locations`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** `{ success, data: NearbyLocation[] }` — up to 6 sibling locations at same ltree depth, scored by name/token match with trek title + address
- **Service:** `TrekService.getNearbyLocations` — multi-step ltree scoring algorithm

---

#### `GET /api/v1/treks/:slug/related`
- **Auth:** Public
- **Path param:** `slug`
- **Query params:** `limit` (default 6)
- **Response:** `{ success, data: RelatedTrek[] }` — treks in same location subtree, each with up to 3 leader names/images (batched, no N+1)
- **Service:** `TrekService.getRelatedTreks`

---

#### `GET /api/v1/treks/:slug/listings`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** `{ success, data: ListingSummary[] }` — each listing includes vendor, optional trek leader, and next available open slot
- **Service:** `TrekService.getTrekListings` — raw SQL with `LATERAL` join for next slot

---

#### `GET /api/v1/treks/me/wishlist` *(stub)*
- **Auth:** `requireAuth`
- **Response:** `{ success: true, message: "Hello <name>" }`
- **Note:** Not yet implemented; placeholder in trek.routes.ts. Must be declared before `/:slug` routes.

---

### Listings — `/api/v1/listings`

**Service file:** `src/services/listing.service.ts`

#### `GET /api/v1/listings/:id`
- **Auth:** Public
- **Path param:** `id` (numeric string, validated with `/^\d+$/`)
- **Response:** Full `ListingDetail` object including vendor detail, trek leader detail, parent trek summary, and all upcoming open/full slots
- **Service:** `ListingService.getListingById` — Prisma `findUnique` with full includes

---

### Bookings — `/api/v1/bookings`

**Service file:** `src/services/booking.service.ts`

#### `POST /api/v1/bookings`
- **Auth:** `requireAuth`
- **Body:**
  ```json
  { "listing_id": number, "slot_id": number, "adult_count": number, "children_count": number, "special_request": "string (optional)" }
  ```
- **Validation:** `listing_id`, `slot_id`, and `adult_count >= 1` are required
- **Response (201):** `{ success: true, data: BookingResponse }` — includes inline listing + slot + vendor
- **Error cases:**
  - 400: missing fields, not enough seats
  - 404: listing/slot not found or listing not active
  - 500 (with SEAT_CONFLICT code): race condition caught in transaction
- **Service:** `BookingService.createBooking` — wraps seat decrement in a Prisma `$transaction` with an optimistic re-check inside the transaction

---

#### `GET /api/v1/bookings`
- **Auth:** `requireAuth`
- **Response:** `{ success: true, data: BookingResponse[] }` — user's bookings scoped by `user_id`, joined to listing + vendor + slot (via LATERAL)
- **Service:** `BookingService.getUserBookings`

---

#### `GET /api/v1/bookings/:id`
- **Auth:** `requireAuth`
- **Path param:** `id` (numeric, validated)
- **Response:** `{ success: true, data: BookingDetailResponse }` — same as list but also includes parent `trek` object (id, title, slug, banner_image)
- **Service:** `BookingService.getBookingById` — scoped by both `id` AND `user_id`

---

### Wishlist — `/api/v1/wishlist`

**Service file:** `src/services/wishlist.service.ts`

#### `GET /api/v1/wishlist`
- **Auth:** `requireAuth`
- **Response:** `{ success, data: WishlistItem[] }` — each item has wishlist metadata + enriched `data` object (trek or experience details)
- **Service:** `WishlistService.getWishlist` — fetches wishlist rows, batches trek/experience lookups with `ANY(ids::bigint[])`

---

#### `POST /api/v1/wishlist`
- **Auth:** `requireAuth`
- **Body:** `{ "item_type": string, "item_id": number, "item_slug": string }`
- **Response (201):** `{ success, data: { id, item_type, item_id, item_slug, created_at } }`
- **Error cases:** 400 if already in wishlist
- **Service:** `WishlistService.addToWishlist`

---

#### `DELETE /api/v1/wishlist/:id`
- **Auth:** `requireAuth`
- **Path param:** `id` (numeric)
- **Response:** `{ success: true, message: "Removed from wishlist" }`
- **Error cases:** 400 invalid ID, 404 not found, 403 belongs to another user
- **Service:** `WishlistService.removeFromWishlist`

---

### Locations — `/api/v1/locations`

**Service file:** `src/services/location.service.ts`

#### `GET /api/v1/locations`
- **Auth:** Public
- **Response:** `{ success, data: LocationCard[] }` — top-level locations (nlevel ≤ 2) with `trek_count` (counts all published treks in subtree)
- **Service:** `LocationService.getLocations` — raw SQL with correlated subquery using ltree `<@`

---

#### `GET /api/v1/locations/:slug`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** Full location detail including `breadcrumb[]`, `children[]` (direct children with trek counts), `trek_count`, `gallery` (images processed), `content`, `general_info`, `map_lat/lng`
- **Service:** `LocationService.getLocationBySlug` — 3 parallel queries (breadcrumb via `@>`, children by `parent_id`, trek count via `<@`)

---

### Categories — `/api/v1/categories`

**Service file:** `src/services/category.service.ts`

#### `GET /api/v1/categories`
- **Auth:** Public
- **Response:** `{ success, data: Category[] }` — each with `id`, `name`, `slug`, `cat_icon`, `trek_count`
- **Service:** `CategoryService.getCategories` — raw SQL with correlated subquery

---

#### `GET /api/v1/categories/:slug/treks`
- **Auth:** Public
- **Path param:** `slug`
- **Query params:** `page`, `limit`
- **Response:** `{ success, data: TrekCard[], meta: PaginationMeta }`
- **Service:** `CategoryService.getTreksByCategory`

---

### Experiences — `/api/v1/experiences`

**Service file:** `src/services/experience.service.ts`

#### `GET /api/v1/experiences`
- **Auth:** Public
- **Query params:** `page`, `limit`, `status` (default `"publish"`), `isFeatured`
- **Response:** `{ success, data: ExperienceCard[], meta: PaginationMeta }`
- **Service:** `ExperienceService.getExperiences` — Prisma `findMany`

---

#### `GET /api/v1/experiences/featured`
- **Auth:** Public
- **Response:** `{ success, data: ExperienceCard[] }` — top 6 featured experiences
- **Service:** `ExperienceService.getFeaturedExperiences`

---

#### `GET /api/v1/experiences/location/:slug`
- **Auth:** Public
- **Path param:** `slug`
- **Query params:** `page`, `limit`
- **Response:** `{ success, data: ExperienceCard[], meta: PaginationMeta }`
- **Service:** `ExperienceService.getExperiencesByLocation` — ltree `<@` cast as `::ltree`

---

#### `GET /api/v1/experiences/:slug`
- **Auth:** Public
- **Path param:** `slug`
- **Response:** Full experience object with `banner_image`, `feature_images`, `gallery` (all processed), `location` object, and `attributes` (grouped by attribute category)
- **Service:** `ExperienceService.getExperienceBySlug` — Prisma `findUnique` with full includes

---

### User — `/api/v1/user`

**Service file:** `src/services/user.service.ts`

#### `GET /api/v1/user/me`
- **Auth:** `requireAuth`
- **Response:** `{ success, data: UserProfileResponse }` — `id`, `name`, `email`, `image` (processed), `emailVerified`, `role`, `createdAt`
- **Service:** `UserService.getMe`

---

#### `PATCH /api/v1/user/me`
- **Auth:** `requireAuth`
- **Body:** `{ "name"?: string, "image"?: string }`
- **Response:** `{ success, data: UserProfileResponse }`
- **Service:** `UserService.updateMe` — only patches provided fields; empty string image sets to `null`

---

### Health Check

#### `GET /health`
- **Auth:** Public
- **Response:** `{ "status": "ok", "message": "ScoutRipper API running" }`

---

## 2. Prisma Schema Summary

**Generator:** `prisma-client` → `../src/generated` (custom output path, not default `node_modules`)  
**Database:** PostgreSQL  
**Adapter:** `@prisma/adapter-pg` (PrismaPg driver adapter)

---

### Models

#### `Location` → table `locations`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id autoincrement | |
| `name` | `String` | |
| `slug` | `String` @unique | |
| `content` | `Json?` | Rich content blob |
| `imageId` | `String?` | S3/storage key (`image_id`) |
| `mapLat/mapLng` | `Float?` | |
| `mapZoom` | `BigInt?` | |
| `status` | `String?` | default `"draft"` |
| `generalInfo` | `Json?` | `general_info` |
| `gallery` | `Json?` | Array of image keys |
| `bannerImage` | `String?` | `banner_image` |
| `parentId` | `BigInt?` | Self-referential FK |
| `path` | `Unsupported("ltree")` | PostgreSQL ltree for hierarchy |
| `type` | `String?` | |
| `createdAt/updatedAt/deletedAt` | `DateTime?` @db.Timestamptz(6) | |

**Relations:** Self-relation `locations↔locations` (parent/children), `experiences[]`, `Trek[]`  
**Indexes:** `parentId`, `path` (GiST), `slug`, `status`

---

#### `DestinationCategory` → table `destination_category`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `name` | `String` | |
| `slug` | `String` @unique | |
| `status` | `String?` | default `"publish"` |
| `catIcon` | `String?` | `cat_icon` |

**Relations:** `Trek[]`

---

#### `Trek` → table `treks`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `title` | `String` | |
| `slug` | `String` @unique | |
| `isFeatured` | `String?` | `"yes"` / `"no"`, default `"no"` |
| `status` | `String?` | default `"draft"` |
| `categoryId` | `BigInt?` | FK → `destination_category` |
| `locationId` | `BigInt?` | FK → `locations` |
| `address` | `String?` | |
| `price / salePrice` | `Float?` @db.Real | |
| `bannerImage` | `String?` | Storage key |
| `gallery / featureImages` | `Json?` | Arrays of storage keys |
| `overview / howToReach / bestTimeToVisit / faqs / itinerary / inclusions / highlights` | `Json?` | Rich content |
| `mapLat/mapLng` | `Float?` | |
| `mapZoom` | `BigInt?` | |
| `duration` | `BigInt?` | Stored in **hours** (days × 24) |
| `totalDistance` | `String?` | |
| `altitude / suitableAge / video / reviewScore` | `String?` | |
| `difficulty` | `String?` | |
| `authorId` | `BigInt?` | Not a FK relation |
| `deletedAt` | `DateTime?` | Soft-delete |

**Relations:** `DestinationCategory?`, `Location?`, `TrekAttribute[]`, `trek_listings[]`, `trek_routes[]`  
**Indexes:** `categoryId`, `isFeatured`, `locationId`, `slug`, `status`

---

#### `AttributeCategory` → table `attributes_category`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `name / slug` | `String` | slug @unique |
| `service` | `String?` | e.g. `"trek"`, `"experience"` |
| `status` | `String?` | default `"publish"` |

**Relations:** `Attribute[]`

---

#### `Attribute` → table `attributes`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `name / slug` | `String` | slug @unique |
| `attrId` | `BigInt?` | FK → `attributes_category` (Cascade delete) |
| `imageId / icon` | `String?` | |
| `status` | `String?` | default `"publish"` |

**Relations:** `AttributeCategory?`, `experience_attributes[]`, `TrekAttribute[]`

---

#### `TrekAttribute` → table `trek_attributes`
Composite PK `(trekId, attributesId)`. Pure join table.  
**Relations:** `Attribute` (Cascade delete), `Trek` (Cascade delete)

---

#### `bookings` → table `bookings`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `item_name / item_type` | `String?` | e.g. `"trek"` |
| `item_id` | `BigInt?` | ID of the trek |
| `listing_id` | `BigInt?` | FK to `trek_listings` (no relation declared) |
| `user_id` | `String?` | Better-Auth user UUID |
| `user_name / user_email` | `String?` | Denormalized |
| `adult_count / children_count` | `BigInt?` | |
| `amount_paid` | `Float?` @db.Real | Actual charge |
| `item_price_total` | `BigInt?` | Total in smallest unit (paise) |
| `scheduled_on` | `DateTime?` | Slot start date |
| `status` | `String?` | `"pending"` etc |
| `reciept / order_id / payment_id` | `String?` | Payment integration fields |
| `special_request` | `String?` | |

**Indexes:** `user_id`, `listing_id`

---

#### `experience_attributes`
Composite PK `(experience_id, attributes_id)`. Join table.  
**Relations:** `Attribute` (Cascade), `experiences` (Cascade)

---

#### `experiences` → table `experiences`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `title / slug` | `String` | slug @unique |
| `content` | `String?` | |
| `location_id` | `BigInt?` | FK → `locations` |
| `banner_image / feature_images / gallery` | `String?` / `Json?` | |
| `ticket_types / faqs / extra_price / overview / inclusions` | `Json?` | |
| `price / sale_price` | `Float?` @db.Real | |
| `duration` | `BigInt?` | |
| `is_featured / is_instant / enable_extra_price / enable_service_fee` | `String?` | `"yes"` / `"no"` |
| `status` | `String?` | |
| `author_id` | `BigInt?` | |

**Relations:** `experience_attributes[]`, `Location?`

---

#### `profiles` → table `profiles`
Standalone user profile table. Not yet wired to `user` via a Prisma relation.  
Fields: `id` (UUID), `bio`, `address_line_1/2`, `state`, `zip_code`, `phone_number`

---

#### `wishlist` → table `wishlist`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `user_id` | `String?` | Better-Auth user UUID |
| `item_type` | `String?` | `"trek"` or `"experience"` |
| `item_id` | `BigInt?` | |
| `item_slug` | `String?` | |

---

#### `user` → table `user` (Better-Auth managed)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` @id | UUID (Better-Auth generated) |
| `name / email` | `String` | email @unique |
| `emailVerified` | `Boolean` | default false |
| `image` | `String?` | |
| `role` | `String` | default `"user"` (custom additional field) |
| `isActive` | `Boolean` | default true (custom additional field) |

**Relations:** `account[]`, `session[]`

---

#### `account`, `session`, `verification` — Better-Auth managed tables
Standard Better-Auth schema. `account` + `session` both cascade-delete on `user` deletion.

---

#### `slugs` → table `slugs`
Slug registry for all content types.  
Fields: `id`, `slug` @unique, `type`, `entity_id`, `name`, `is_active`

---

#### `trek_leaders` → table `trek_leaders`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `vendor_id` | `BigInt?` | FK → `vendors` (Cascade) |
| `name` | `String` | |
| `image` | `String?` | Storage key |
| `experience_years` | `Int?` | |
| `certifications` | `Json?` | |
| `bio` | `String?` | |
| `rating` | `Float?` @db.Real | |
| `review_count` | `Int?` | default 0 |
| `status` | `String?` | default `"active"` |

**Relations:** `vendors?`, `trek_listings[]`

---

#### `trek_listings` → table `trek_listings`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `trek_id / vendor_id / trek_leader_id` | `BigInt?` | FKs |
| `title` | `String` | |
| `tags` | `Json?` | |
| `route_name` | `String?` | |
| `price / sale_price` | `Float?` @db.Real | |
| `duration_days` | `Int?` | |
| `distance_km / elevation_gain / ascent_time / descent_time` | `String?` | |
| `difficulty / meeting_point` | `String?` | |
| `intro_text / cancellation_policy` | `String?` | |
| `itinerary / inclusions / exclusions / highlights` | `Json?` | |
| `is_popular` | `Boolean?` | default false |
| `status` | `String?` | default `"active"` |

**Relations:** `Trek?` (Cascade), `trek_leaders?`, `vendors?` (Cascade), `trek_slots[]`

---

#### `trek_slots` → table `trek_slots`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `listing_id` | `BigInt?` | FK → `trek_listings` (Cascade) |
| `start_date / end_date` | `DateTime` @db.Date | |
| `total_seats / available_seats` | `Int` | |
| `booked_seats` | `Int?` | default 0 |
| `status` | `String?` | `"open"` / `"full"` / `"closed"` |

**Relations:** `trek_listings?`

---

#### `vendors` → table `vendors`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `name` | `String` | |
| `email` | `String?` @unique | |
| `phone` | `String?` | |
| `logo` | `String?` | Storage key |
| `description` | `String?` | |
| `is_verified` | `Boolean?` | default false |
| `status` | `String?` | default `"active"` |

**Relations:** `trek_leaders[]`, `trek_listings[]`

---

#### `trek_routes` → table `trek_routes`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `BigInt` @id | |
| `trek_id` | `BigInt?` | FK → `treks` (Cascade) |
| `name` | `String` | |
| `distance_km / difficulty` | `String?` | |
| `is_popular` | `Boolean?` | default false |
| `days` | `Json?` | Array of day objects, may contain nested `image` keys |

**Relations:** `Trek?`

---

### Model Relation Map

```
user ──────────────┬── account (1:N, cascade)
                   └── session (1:N, cascade)

vendors ───────────┬── trek_leaders (1:N, cascade)
                   └── trek_listings (1:N, cascade)

Trek ───────────────┬── DestinationCategory (N:1)
                   ├── Location (N:1)
                   ├── TrekAttribute[] ──── Attribute (N:M join)
                   ├── trek_listings[] ─── trek_slots[] (cascade)
                   └── trek_routes[] (cascade)

Location ──────────┬── Location (self: parent/children)
                   ├── Trek[] 
                   └── experiences[]

experiences ───────┬── Location (N:1)
                   └── experience_attributes[] ── Attribute (N:M join)

Attribute ─────────── AttributeCategory (N:1, cascade delete)
```

---

## 3. Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `src/utils/db.ts` | PostgreSQL connection string for PrismaPg adapter |
| `PORT` | `src/index.ts` | HTTP server port (default 8000) |
| `BETTER_AUTH_SECRET` | `src/lib/auth.ts` | JWT/session signing secret for Better-Auth |
| `BETTER_AUTH_URL` | `src/lib/auth.ts` | Base URL for Better-Auth (used in email links) |
| `GOOGLE_CLIENT_ID` | `src/lib/auth.ts` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `src/lib/auth.ts` | Google OAuth client secret |
| `EMAIL_FROM` | `src/lib/auth.ts` | Gmail address for sending password reset emails |
| `EMAIL_PASSWORD` | `src/lib/auth.ts` | Gmail app password for nodemailer |
| `STORAGE_URL` | `src/utils/image.ts` | Base URL for object storage (e.g. `https://cdn.example.com`) |
| `FRONTEND_URL` | `src/lib/auth.ts` | Added to `trustedOrigins`; referenced but **not in `.env`** |

> **Note:** `FRONTEND_URL` is used in `trustedOrigins` but is absent from `.env` — it falls back to `""`. This means cross-origin requests from a deployed frontend may fail unless the variable is added.

---

## 4. Special Patterns & Gotchas

### BigInt Handling

PostgreSQL `BIGINT` columns map to JavaScript `BigInt` in Prisma. Several patterns exist:

1. **Global JSON serialiser** (in `src/index.ts`):
   ```typescript
   (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
     return this.toString();
   };
   ```
   This patches `BigInt.prototype.toJSON` so `JSON.stringify` never throws on BigInt values. Applied at app startup before any routes.

2. **Manual `.toString()` in serializers** — every service file manually converts BigInt IDs to strings before returning them in response objects (e.g. `id: r.id.toString()`). This is the primary safe pattern.

3. **Conversion from request params** — URL params arrive as strings; controllers validate with `/^\d+$/` and convert with `BigInt(rawId)` before passing to services.

4. **`$queryRawUnsafe` params** — when building dynamic queries, numeric filters are cast with `BigInt(value)` before being added to the params array (e.g. `BigInt(categoryId)`, `BigInt(duration * 24)`).

5. **`count`** — raw SQL COUNT results come back as `bigint` when cast with `::bigint`. Services convert with `Number(countResult[0]?.count ?? 0)`.

---

### ltree Queries

PostgreSQL `ltree` extension is used on `locations.path` for hierarchical location data. The column is typed as `Unsupported("ltree")` in Prisma and has a GiST index.

Key operators used:

| Operator | Meaning | Example usage |
|----------|---------|---------------|
| `<@` | Is descendant of (or equal) | `l.path <@ (SELECT path FROM locations WHERE id = $1)` |
| `@>` | Is ancestor of (or equal) | `path @> (SELECT path FROM locations WHERE slug = $1)` |
| `nlevel(path)` | Depth of path | `nlevel(path) <= 2` (top-level locations) |
| `subpath(path, 0, nlevel(path) - 1)` | Parent path | Used in `getNearbyLocations` to find siblings |

**Usage patterns:**
- **Treks by location:** `l.path <@ ancestorPath` — finds all treks in any sub-location of a given location
- **Breadcrumb:** `path @> currentPath` — returns all ancestors ordered by `nlevel ASC`
- **Nearby locations:** multi-step — find trek's location, score child candidates by name match, get `subpath` of chosen location, find siblings at same depth
- **Experience by location:** same `<@` operator but path cast explicitly as `::ltree` in tagged template literals

**Gotcha:** When using `$queryRawUnsafe` (string interpolation), the path variable is a plain `text` string. When using `$queryRaw` (tagged template), values must be cast explicitly: `${location.path}::ltree`.

---

### Image URL Building

All image fields in the database store either:
1. A relative storage key (e.g. `uploads/trek/banner.jpg`)
2. A full URL (e.g. `https://cdn.example.com/...`)
3. `null`

`src/utils/image.ts` — `buildImageUrl(key: string | null): string | null`:
- Returns `null` if key is null or empty
- Returns key as-is if it already starts with `"http"`
- Otherwise prepends `STORAGE_URL` (trailing slash trimmed) + `/` + key (leading slash trimmed)

**Gallery/array handling:** Services define local `buildImageGallery` / `buildImageList` helpers that map over JSON arrays applying `buildImageUrl` to string items. Objects are passed through unchanged.

**Route days:** `transformRouteDays` in `trek.service.ts` recursively walks nested objects/arrays and processes any field named `"image"` through `buildImageUrl`.

---

### Auth Session Retrieval

`src/middlewares/auth.middleware.ts` exports two middleware functions:

**`requireAuth`:**
```typescript
const session = await auth.api.getSession({
  headers: fromNodeHeaders(req.headers),
});
```
- `fromNodeHeaders` (from `better-auth/node`) converts Node.js `IncomingHttpHeaders` to a Web `Headers` object
- If session exists, attaches `req.user = { id, email, name, role, isActive }` where `role` and `isActive` are cast from `session.user as any` (they are custom fields not in Better-Auth's base type)
- Returns 401 JSON if no session or on error

**`requireAdmin`:**
- Calls `requireAuth` then checks `req.user.role === "admin"`, returning 403 if not

**`AuthRequest`** interface extends `Express.Request` adding optional `user` property.

---

### Prisma Client Initialization

`src/utils/db.ts`:
```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```
- Uses **driver adapters** (`@prisma/adapter-pg`) instead of the default Prisma engine
- Client is imported from `../generated/client` (custom output path in schema)
- Single singleton exported as default; no connection pooling wrapper
- `dotenv.config()` called here as well as in `index.ts`

**Import path:** All files import as `import prisma from "../utils/db"`.

---

### Booking Seat Conflict Prevention

`BookingService.createBooking` uses a two-phase check:
1. **Pre-check (outside transaction):** Verify `available_seats >= totalPeople`
2. **Re-check inside `$transaction`:** Re-read `trek_slots` with `findUnique` and throw with `code: "SEAT_CONFLICT"` if stale

The controller catches `SEAT_CONFLICT` errors and returns 400. This prevents double-booking under concurrent requests.

---

### Duration Encoding

Trek `duration` is stored in **hours** in the database (`BigInt`). The controller accepts `duration` as days and converts: `BigInt(duration * 24)`. Serializers output `duration.toString()` keeping it in hours. Clients must divide by 24 to display as days.

---

### Soft Deletes

`Location`, `Trek`, and `experiences` all have a `deleted_at`/`deletedAt` timestamp field. All queries explicitly filter `deleted_at IS NULL` or `deletedAt: null`. No Prisma middleware handles this automatically — it must be added manually to every query.

---

## 5. File Structure

```
scoutripper_backend/
├── prisma/
│   └── schema.prisma               # All models, relations, and PostgreSQL config
├── src/
│   ├── generated/                  # Auto-generated Prisma client (do not edit)
│   ├── index.ts                    # Express app entry: mounts routes, patches BigInt, starts server
│   ├── lib/
│   │   └── auth.ts                 # Better-Auth instance: email+password, Google OAuth, nodemailer
│   ├── utils/
│   │   ├── db.ts                   # Prisma client singleton using PrismaPg driver adapter
│   │   └── image.ts                # buildImageUrl() helper: relative key → full CDN URL
│   ├── middlewares/
│   │   └── auth.middleware.ts      # requireAuth + requireAdmin guards; attaches req.user
│   ├── routes/
│   │   ├── trek.routes.ts          # Trek CRUD + nested routes (breadcrumb, listings, related, etc.)
│   │   ├── listing.routes.ts       # Single listing detail by ID
│   │   ├── booking.routes.ts       # Create booking, list user bookings, booking detail
│   │   ├── wishlist.routes.ts      # Get / add / remove wishlist items
│   │   ├── location.routes.ts      # Location list + detail by slug
│   │   ├── category.routes.ts      # Category list + treks by category
│   │   ├── experience.routes.ts    # Experience list, featured, by location, by slug
│   │   └── user.routes.ts          # Current user profile get + update
│   ├── controllers/
│   │   ├── trek.controller.ts      # Handles all 9 trek route handlers, parses query filters
│   │   ├── listing.controller.ts   # Single handler: getListingById with ID validation
│   │   ├── booking.controller.ts   # createBooking, getUserBookings, getBookingById
│   │   ├── wishlist.controller.ts  # getWishlist, addToWishlist, removeFromWishlist
│   │   ├── location.controller.ts  # getLocations, getLocationBySlug
│   │   ├── category.controller.ts  # getCategories, getTreksByCategory
│   │   ├── experience.controller.ts# getExperiences, getFeaturedExperiences, by slug, by location
│   │   └── user.controller.ts      # getMe, updateMe
│   ├── services/
│   │   ├── trek.service.ts         # Core trek logic: getAllTreks (raw SQL), getTrekBySlug, breadcrumb, listings, routes, related, featured, nearby locations (864 lines)
│   │   ├── listing.service.ts      # getListingById: full listing with vendor, leader, trek, slots
│   │   ├── booking.service.ts      # createBooking (transactional), getUserBookings, getBookingById
│   │   ├── wishlist.service.ts     # Wishlist CRUD with batched enrichment queries
│   │   ├── location.service.ts     # getLocations (ltree), getLocationBySlug (breadcrumb + children)
│   │   ├── category.service.ts     # getCategories, getTreksByCategory
│   │   ├── experience.service.ts   # getExperiences, getFeaturedExperiences, by slug, by location
│   │   └── user.service.ts         # getMe, updateMe using Prisma ORM
│   └── types/
│       ├── trek.types.ts           # TrekFilters, PaginationMeta, ApiResponse interfaces
│       ├── listing.types.ts        # ListingSummary, ListingDetail, VendorDetail, TrekLeaderDetail, SlotDetail
│       ├── booking.types.ts        # CreateBookingBody, BookingResponse, BookingDetailResponse
│       └── user.types.ts           # UserProfileResponse interface
├── package.json                    # ESM project, ts-node/esm dev runner, prisma generate postinstall
├── tsconfig.json                   # ES2020 target, ESNext modules, bundler resolution, strict mode
├── .env                            # Environment variables (see Section 3)
└── PROJECT_CONTEXT.md              # This file
```

---

*End of PROJECT_CONTEXT.md*
