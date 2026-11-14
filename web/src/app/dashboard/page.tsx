import type { Metadata } from "next";
import DashboardApp from "@/components/dashboard/DashboardApp";

export const metadata: Metadata = {
  title: "Dashboard · Qualty.AI",
  description: "Manage enquiries, bookings, service listings, payouts and accreditations for your inspection company.",
};

export default function DashboardPage() {
  return <DashboardApp />;
}
