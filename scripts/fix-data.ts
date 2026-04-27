import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Show current state ---
  const listings = await prisma.$queryRawUnsafe<{ id: bigint; title: string; vendor_id: bigint }[]>(
    `SELECT id, title, vendor_id FROM trek_listings ORDER BY id`
  );
  console.log("Current listings:");
  listings.forEach((l) => console.log(`  [${l.id}] vendor_id=${l.vendor_id}  ${l.title}`));

  const slots = await prisma.$queryRawUnsafe<{ id: bigint; listing_id: bigint; start_date: string; status: string }[]>(
    `SELECT id, listing_id, start_date::text, status FROM trek_slots ORDER BY id`
  );
  console.log("\nCurrent slots:");
  slots.forEach((s) => console.log(`  [${s.id}] listing_id=${s.listing_id}  ${s.start_date}  ${s.status}`));

  // --- Delete duplicate listings (keep id 1 and 2, delete 3 and 4) ---
  console.log("\nDeleting duplicate listings (id 3, 4) and their slots…");
  await prisma.$executeRawUnsafe(`DELETE FROM trek_slots WHERE listing_id IN (3, 4)`);
  await prisma.$executeRawUnsafe(`DELETE FROM trek_listings WHERE id IN (3, 4)`);
  console.log("✓ Duplicates removed");

  // --- Delete all old slots for listing 1 and 2 ---
  console.log("Deleting stale slots for listings 1 and 2…");
  await prisma.$executeRawUnsafe(`DELETE FROM trek_slots WHERE listing_id IN (1, 2)`);
  console.log("✓ Old slots cleared");

  // --- Insert fresh future slots ---
  // Listing 1 – The Trek Tribe / Rishabh Sharma (4-day trek, small batch of 12)
  await prisma.$executeRawUnsafe(`
    INSERT INTO trek_slots (listing_id, start_date, end_date, total_seats, available_seats, booked_seats, status)
    VALUES
      (1, '2026-05-16', '2026-05-19', 12,  4, 8, 'open'),
      (1, '2026-06-06', '2026-06-09', 12, 12, 0, 'open'),
      (1, '2026-06-20', '2026-06-23', 12,  9, 3, 'open')
  `);
  console.log("✓ 3 future slots inserted for Listing 1");

  // Listing 2 – Himalayan Footprints / Amit Rawat (3-day weekend trek, 16 seats)
  await prisma.$executeRawUnsafe(`
    INSERT INTO trek_slots (listing_id, start_date, end_date, total_seats, available_seats, booked_seats, status)
    VALUES
      (2, '2026-05-23', '2026-05-25', 16,  0, 16, 'full'),
      (2, '2026-06-13', '2026-06-15', 16, 11,  5, 'open'),
      (2, '2026-07-04', '2026-07-06', 16, 16,  0, 'open')
  `);
  console.log("✓ 3 future slots inserted for Listing 2 (1 full, 2 open)");

  // --- Verify ---
  const finalListings = await prisma.$queryRawUnsafe<{ id: bigint; title: string }[]>(
    `SELECT id, title FROM trek_listings ORDER BY id`
  );
  const finalSlots = await prisma.$queryRawUnsafe<{ id: bigint; listing_id: bigint; start_date: string; available_seats: number; status: string }[]>(
    `SELECT id, listing_id, start_date::text, available_seats, status FROM trek_slots ORDER BY listing_id, start_date`
  );

  console.log("\n=== Final state ===");
  finalListings.forEach((l) => {
    console.log(`\nListing [${l.id}] ${l.title}`);
    finalSlots
      .filter((s) => s.listing_id.toString() === l.id.toString())
      .forEach((s) => console.log(`  slot [${s.id}]  ${s.start_date}  avail: ${s.available_seats}  ${s.status}`));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
