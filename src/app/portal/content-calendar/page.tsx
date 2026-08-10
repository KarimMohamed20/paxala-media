import { redirect } from "next/navigation";

/**
 * The calendar lives at /portal/calendar — that is what the portal sidebar links
 * to, so serving it from both URLs left the nav highlight broken on this one.
 * Kept as a redirect so existing links and bookmarks keep working.
 */
export default function ContentCalendarRedirect() {
  redirect("/portal/calendar");
}
