"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const LINKS = [
  { href: "/spaces", label: "Spaces" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/explore", label: "Explorer" },
  { href: "/alerts", label: "Alertas" },
  { href: "/admin", label: "Admin" },
];

export function TopNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session || pathname === "/login" || pathname === "/setup") return null;

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold">
          BiTool
        </Link>
        <nav className="flex gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium ${
                pathname?.startsWith(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{session.user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="font-medium text-foreground underline"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
