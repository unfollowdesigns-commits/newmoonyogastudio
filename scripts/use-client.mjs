// Copies the chosen studio's logo and icons into the places Next.js serves them from.
// Runs automatically before `npm run dev` and `npm run build` (Vercel included).
import { cpSync, existsSync, readdirSync } from "node:fs";

const id = process.env.NEXT_PUBLIC_CLIENT || "newmoon";
const brand = `clients/${id}/brand`;
if (!existsSync(brand)) {
  console.error(`✗ ${brand} not found — is NEXT_PUBLIC_CLIENT right?`);
  process.exit(1);
}
for (const f of readdirSync(brand)) {
  // icon.png / apple-icon.png are the browser-tab and iPhone icons (app/ file convention)
  const dest = f === "icon.png" || f === "apple-icon.png" ? `app/${f}` : `public/${f}`;
  cpSync(`${brand}/${f}`, dest);
}
console.log(`✓ studio: ${id}`);
