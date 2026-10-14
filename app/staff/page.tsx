import type { Metadata } from "next";
import StaffApp from "@/components/staff/StaffApp";

export const metadata: Metadata = { title: "Staff Portal · New Moon Yoga Studio", robots: { index: false } };

export default function StaffPage() {
  return <StaffApp />;
}
