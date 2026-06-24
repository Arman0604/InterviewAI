import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HomePageClient from "./HomePageClient";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <HomePageClient name={session.name} />;
}
