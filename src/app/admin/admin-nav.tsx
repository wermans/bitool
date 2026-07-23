"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/groups", label: "Grupos" },
  { href: "/admin/attributes", label: "Atributos (RLS)" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/sso", label: "SSO/SAML" },
  { href: "/admin/impersonate", label: "Impersonation" },
  { href: "/admin/tokens", label: "Tokens" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
