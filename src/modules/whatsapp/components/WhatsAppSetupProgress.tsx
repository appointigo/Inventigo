import { Steps } from "antd";

const steps = [
  { title: "Connect Meta", content: "Authorize your business" },
  { title: "Choose account", content: "Select a WhatsApp Business Account" },
  { title: "Assign sender", content: "Map a number to this Store" },
  { title: "Ready", content: "Review and start messaging" },
];

export default function WhatsAppSetupProgress({ current = 0 }: { current?: number }) {
  return <Steps current={current} items={steps} responsive size="small" />;
}
