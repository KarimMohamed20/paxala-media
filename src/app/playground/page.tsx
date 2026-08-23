import { PlaygroundBackLink } from "@/components/playground/back-link";
import { PlaygroundDashboard } from "@/components/playground/playground-dashboard";

export const metadata = {
  title: "PMP Playground",
  description: "Ideas become real — PMP's collaborative creative rooms.",
};

export default function PlaygroundPage() {
  return (
    <>
      <PlaygroundBackLink />
      <PlaygroundDashboard />
    </>
  );
}
