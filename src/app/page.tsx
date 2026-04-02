import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Phase B2: Landing page placeholder.
// Authenticated users with a complete setup go straight to dashboard.
// Full landing page UI is built in Phase C.
const Home = async () => {
  const session = await auth();

  if (session?.user) {
    if (session.user.emailVerified && session.user.orgId) {
      redirect("/dashboard");
    }
    if (!session.user.emailVerified) {
      redirect("/verify-email");
    }
    if (!session.user.orgId) {
      redirect("/onboarding");
    }
  }

  // Unauthenticated — redirect to login (landing page built in Phase C)
  redirect("/login");
}

export default Home;
