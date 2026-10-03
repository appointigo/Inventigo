import type { Metadata } from "next";
import InteractiveDemo from "./InteractiveDemo";

export const metadata: Metadata = {
  title: "Interactive Demo | Stockiva",
  description: "Explore a safe, simulated Stockiva clothing retail workflow.",
};

export default function DemoPage() {
  return <InteractiveDemo />;
}
