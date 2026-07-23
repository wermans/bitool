"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type SamlStatus = { enabled: boolean; disablePasswordLogin: boolean };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const samlError = searchParams.get("error");

  const [saml, setSaml] = useState<SamlStatus>({
    enabled: false,
    disablePasswordLogin: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/saml/status")
      .then((r) => r.json())
      .then(setSaml)
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const showPasswordForm = !saml.enabled || !saml.disablePasswordLogin;

  return (
    <div className="space-y-4">
      {samlError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Falha na autenticação SSO ({samlError}).
        </p>
      )}

      {saml.enabled && (
        <a
          href="/api/auth/saml/login"
          className="block w-full rounded-md border border-border px-3 py-2 text-center text-sm font-medium hover:bg-muted"
        >
          Entrar com SSO
        </a>
      )}

      {saml.enabled && showPasswordForm && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {showPasswordForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      )}
    </div>
  );
}
