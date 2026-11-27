import type { Metadata } from "next";
import AdminStats from "@/components/admin/AdminStats";

export const metadata: Metadata = {
  title: "Platform stats · Qualty",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminStats />;
}
