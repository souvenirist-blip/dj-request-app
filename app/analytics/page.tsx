"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Statsページにリダイレクト
    router.replace("/stats");
  }, [router]);

  return null;
}
