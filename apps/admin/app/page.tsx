import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export default async function AdminEntry() {
  if (!(await readSession())) redirect("/sign-in");
  redirect("/dashboard");
}
