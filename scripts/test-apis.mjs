import { readFileSync } from "fs";
import { join } from "path";

const TEMP = process.env.TEMP || process.env.TMP || "/tmp";

function check(label, file) {
  try {
    const raw = readFileSync(join(TEMP, file), "utf8");
    const d = JSON.parse(raw);
    if (!d.success) {
      console.error(`❌ ${label}: success=false`, d);
      return null;
    }
    return d.data;
  } catch (e) {
    console.error(`❌ ${label}: parse error`, e.message);
    return null;
  }
}

// --- Trek detail ---
const trek = check("GET /treks/kareri-lake-trek", "t1.json");
if (trek) {
  console.log("=== TREK DETAIL ===");
  console.log("  min_price:     ", trek.min_price);
  console.log("  listing_count: ", trek.listing_count);
  console.log("  leader_count:  ", trek.leader_count);
  if (trek.expedition_team?.length) {
    console.log("  expedition_team:");
    trek.expedition_team.forEach((m) =>
      console.log(`    - [${m.id}] ${m.name} | rating: ${m.rating} | certs: ${JSON.stringify(m.certifications)}`)
    );
  } else {
    console.log("  expedition_team: (empty)");
  }
}

// --- Trek listings ---
const listings = check("GET /treks/kareri-lake-trek/listings", "t2.json");
if (listings) {
  console.log("\n=== TREK LISTINGS ===");
  console.log("  count:", listings.length);
  listings.forEach((l) => {
    console.log(`  - [${l.id}] ${l.title}`);
    console.log(`      vendor: ${l.vendor.name} | verified: ${l.vendor.is_verified}`);
    console.log(`      trek_leader: ${l.trek_leader?.name ?? "none"}`);
    console.log(`      next_slot: ${l.next_slot ? `${l.next_slot.start_date} → ${l.next_slot.end_date} (${l.next_slot.available_seats} seats, ${l.next_slot.status})` : "none"}`);
  });
}

// --- Listing detail ---
const listing = check("GET /listings/1", "t3.json");
if (listing) {
  console.log("\n=== LISTING DETAIL ===");
  console.log(`  id: ${listing.id} | title: ${listing.title}`);
  console.log(`  vendor: ${listing.vendor?.name} | verified: ${listing.vendor?.is_verified} | phone: ${listing.vendor?.phone}`);
  console.log(`  trek_leader: ${listing.trek_leader?.name} | rating: ${listing.trek_leader?.rating} | review_count: ${listing.trek_leader?.review_count}`);
  console.log(`  trek: ${listing.trek?.slug}`);
  console.log(`  slots (${listing.slots?.length}):`);
  (listing.slots ?? []).forEach((s) =>
    console.log(`    - ${s.start_date} → ${s.end_date} | ${s.available_seats}/${s.total_seats} seats | ${s.status}`)
  );
}
