import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { RevenueByCustomerView } from "../components/RevenueByCustomerView";

const title = "Revenue by Customer";
const description = "View revenue aggregated by customer to understand which customers matter most.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports/by-customer",
  },
};

export default function RevenueByCustomerPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <RevenueByCustomerView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
