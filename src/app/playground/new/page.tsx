import { PlaygroundDashboard } from "@/components/playground/playground-dashboard";

export const metadata = {
  title: "New Playground",
};

/**
 * Deep-linkable room creation.
 *
 * Renders the dashboard with the create dialog already open, rather than being a
 * separate form. One creation flow, one set of validation, one place to change
 * it — and "New Playground" in an email or a bookmark lands somewhere useful
 * instead of on a page that duplicates the dialog and drifts from it.
 */
export default function NewPlaygroundPage() {
  return <PlaygroundDashboard openCreateOnMount />;
}
