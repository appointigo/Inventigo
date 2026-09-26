import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "./LandingPage";
import { getPublicPricingCatalog } from "@/modules/marketing/getPricingCatalog";

const Home = async () => {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") redirect("/admin");
    if (!session.user.emailVerified) redirect("/verify-email");
    if (!session.user.orgId) redirect("/onboarding");
    redirect("/dashboard");
  }

  // Unauthenticated — show marketing landing page
  return <LandingPage pricingCatalog={await getPublicPricingCatalog()} />;
};

export default Home;
