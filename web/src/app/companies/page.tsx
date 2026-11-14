import type { Metadata } from "next";
import CompaniesPage from "@/components/companies/CompaniesPage";

export const metadata: Metadata = {
  title: "For inspection companies · Qualty",
  description:
    "List your inspection services and ports, bid on buyer enquiries, run the job in one chat with the customer, and get paid through Qualty.",
};

export default function Page() {
  return <CompaniesPage />;
}
