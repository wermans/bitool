"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!session?.user?.impersonatedBy) return null;

  async function stop() {
    setLoading(true);
    await fetch("/api/admin/impersonate/stop", { method: "POST" });
    router.push("/admin/impersonate");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        Personificando <strong>{session.user.email}</strong> (sessão original:{" "}
        {session.user.impersonatedBy.email})
      </span>
      <button
        onClick={stop}
        disabled={loading}
        className="rounded bg-amber-950/10 px-2 py-1 hover:bg-amber-950/20 disabled:opacity-50"
      >
        {loading ? "Saindo..." : "Voltar para admin"}
      </button>
    </div>
  );
}
