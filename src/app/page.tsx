import { redirect } from "next/navigation";

/** The app has no marketing page; everything starts at the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}
