import "dotenv/config";
import prisma from "../src/utils/db";

async function main() {
  try {
    const params: (string | number | bigint)[] = [];
    let n = 1;
    const push = (v: string | number | bigint) => { params.push(v); return `$${n++}`; };

    const status = "publish";
    const limit = 2;
    const skip = 0;

    const conds = ["t.deleted_at IS NULL", `t.status = ${push(status)}`];
    const joins = [
      "LEFT JOIN locations l ON l.id = t.location_id",
      "LEFT JOIN destination_category dc ON dc.id = t.category_id",
    ];

    const joinStr = joins.join("\n");
    const whereStr = `WHERE ${conds.join(" AND ")}`;

    const dataSql = `
      SELECT DISTINCT
        t.id, t.title, t.slug, t.banner_image, t.price, t.sale_price,
        t.duration, t.altitude, t.total_distance, t.is_featured,
        t.status, t.review_score,
        l.id AS location_id, l.name AS location_name, l.slug AS location_slug,
        dc.id AS category_id, dc.name AS category_name, dc.slug AS category_slug
      FROM treks t
      ${joinStr}
      ${whereStr}
      ORDER BY t.created_at DESC
      LIMIT ${push(limit)} OFFSET ${push(skip)}
    `;

    console.log("SQL:", dataSql);
    console.log("Params:", params);

    const result = await prisma.$queryRawUnsafe(dataSql, ...params);
    console.log("Success! First result:", JSON.stringify((result as any[])[0], null, 2));
  } catch (e: any) {
    console.error("ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
