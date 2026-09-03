import { Steps } from "antd";

const steps = [
  { title: "Connect Meta", description: "Authorize your business" },
  { title: "Choose account", description: "Select a WhatsApp Business Account" },
  { title: "Assign sender", description: "Map a number to this Store" },
  { title: "Ready", description: "Review and start messaging" },
];

export default function WhatsAppSetupProgress({ current = 0 }: { current?: number }) {
  return <Steps current={current} items={steps} responsive size="small" />;
}

