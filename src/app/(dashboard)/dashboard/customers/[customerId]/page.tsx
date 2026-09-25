import CustomerFullProfile from "@/modules/customers/components/CustomerFullProfile";

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ customerId }, query] = await Promise.all([params, searchParams]);
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : null;
  const tab = typeof query.tab === "string" ? query.tab : null;
  return <CustomerFullProfile customerId={customerId} returnTo={returnTo} initialTab={tab} />;
}
