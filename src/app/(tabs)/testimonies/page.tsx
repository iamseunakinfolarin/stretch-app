import { redirect } from "next/navigation";

/** Testimonies are now called Thanksgiving. Old links and bookmarks land on the new page. */
export default function TestimoniesPage() {
  redirect("/thanksgiving");
}
