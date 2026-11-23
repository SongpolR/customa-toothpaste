import type { Metadata } from "next";
import Composer from "@/components/compose/Composer";

export const metadata: Metadata = { title: "Compose — Customa" };

export default function ComposePage() {
  return <Composer />;
}
