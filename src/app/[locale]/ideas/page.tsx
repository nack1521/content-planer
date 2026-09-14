import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReferenceAccountsAction } from "@/app/actions/reference-accounts";
import { ReferenceAccountsView } from "@/components/ideas/ReferenceAccountsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  if (resolvedParams.locale !== "th" && resolvedParams.locale !== "en") {
    notFound();
  }
  const isThai = resolvedParams.locale === "th";
  return {
    title: isThai
      ? "บัญชีอ้างอิงและแรงบันดาลใจ — Content Planner"
      : "Reference Accounts & Inspiration — Content Planner",
    description: isThai
      ? "รวบรวมบัญชีอ้างอิงและแนวคิดคอนเทนต์สำหรับการผลิต"
      : "Curated reference accounts and inspiration bank for production",
  };
}

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== "th" && resolvedParams.locale !== "en") {
    notFound();
  }

  const { accounts, error } = await getReferenceAccountsAction();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ReferenceAccountsView initialAccounts={accounts} initialError={error} />
    </div>
  );
}
