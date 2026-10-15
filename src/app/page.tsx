import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "./LandingPage";
import { getPublicPricingCatalog } from "@/modules/marketing/getPricingCatalog";
import { prisma } from "@/lib/db";
import { getEffectiveCommercialAccess } from "@/modules/subscriptions/accessService";
import { requiresSubscriptionActivation } from "@/modules/subscriptions/navigationPolicy";

const Home = async () => {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") redirect("/admin");
    if (!session.user.emailVerified) redirect("/verify-email");
    if (!session.user.orgId) redirect("/onboarding");
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { saasBillingRequired: true },
    });
    if (organization?.saasBillingRequired) {
      const access = await getEffectiveCommercialAccess(session.user.orgId);
      if (requiresSubscriptionActivation(true, access.source)) redirect("/subscription/pending");
    }
    redirect("/dashboard");
  }

  // Unauthenticated — show marketing landing page
  return <LandingPage pricingCatalog={await getPublicPricingCatalog()} />;
};

export default Home;
