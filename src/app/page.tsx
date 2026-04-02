import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "./LandingPage";

const Home = async () => {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") redirect("/admin");
    if (!session.user.emailVerified) redirect("/verify-email");
    if (!session.user.orgId) redirect("/onboarding");
    redirect("/dashboard");
  }

  // Unauthenticated — show marketing landing page
  return <LandingPage />;
};

export default Home;
