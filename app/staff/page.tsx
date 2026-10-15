import type { Metadata } from "next";
import { studio } from "@/clients";
import StaffApp from "@/components/staff/StaffApp";

export const metadata: Metadata = { title: `Staff Portal · ${studio.name}`, robots: { index: false } };

export default function StaffPage() {
  return <StaffApp />;
}
