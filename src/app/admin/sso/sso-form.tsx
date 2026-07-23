"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Config = {
  provider: "SAML_ENTRA_ID" | "SAML_OKTA" | "SAML_GENERIC";
  entityId: string;
  ssoLoginUrl: string;
  ssoLogoutUrl: string;
  certificate: string;
  metadataUrl: string;
  attributeMapping: { email?: string; name?: string };
  allowedDomains: string[];
  isEnabled: boolean;
  disablePasswordLogin: boolean;
};

const EMPTY: Config = {
  provider: "SAML_GENERIC",
  entityId: "",
  ssoLoginUrl: "",
  ssoLogoutUrl: "",
  certificate: "",
  metadataUrl: "",
  attributeMapping: { email: "email", name: "name" },
  allowedDomains: [],
  isEnabled: false,
  disablePasswordLogin: false,
};

export function SsoForm({ initialConfig }: { initialConfig: Config | null }) {
  const router = useRouter();
  const [form, setForm] = useState<Config>(initialConfig ?? EMPTY);
  const [allowedDomainsRaw, setAllowedDomainsRaw] = useState(
    (initialConfig?.allowedDomains ?? []).join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/admin/sso", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        allowedDomains: allowedDomainsRaw
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Erro ao salvar SSO."
      );
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Provider</label>
          <select
            value={form.provider}
            onChange={(e) =>
              setForm((f) => ({ ...f, provider: e.target.value as Config["provider"] }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="SAML_ENTRA_ID">Microsoft EntraID</option>
            <option value="SAML_OKTA">Okta</option>
            <option value="SAML_GENERIC">SAML genérico</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Entity ID do IdP</label>
          <input
            required
            value={form.entityId}
            onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">SSO Login URL</label>
        <input
          required
          type="url"
          value={form.ssoLoginUrl}
          onChange={(e) => setForm((f) => ({ ...f, ssoLoginUrl: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">SSO Logout URL (opcional)</label>
        <input
          type="url"
          value={form.ssoLogoutUrl}
          onChange={(e) => setForm((f) => ({ ...f, ssoLogoutUrl: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Certificado X.509 (PEM)</label>
        <textarea
          required
          rows={6}
          value={form.certificate}
          onChange={(e) => setForm((f) => ({ ...f, certificate: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Atributo do e-mail</label>
          <input
            value={form.attributeMapping.email ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                attributeMapping: { ...f.attributeMapping, email: e.target.value },
              }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Atributo do nome</label>
          <input
            value={form.attributeMapping.name ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                attributeMapping: { ...f.attributeMapping, name: e.target.value },
              }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Domínios permitidos (separados por vírgula, vazio = todos)
        </label>
        <input
          value={allowedDomainsRaw}
          onChange={(e) => setAllowedDomainsRaw(e.target.value)}
          placeholder="empresa.com, empresa.com.br"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isEnabled}
          onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))}
        />
        SSO habilitado
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.disablePasswordLogin}
          onChange={(e) =>
            setForm((f) => ({ ...f, disablePasswordLogin: e.target.checked }))
          }
        />
        Desabilitar login por senha (super-admin sempre mantém acesso via
        break-glass)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Configuração salva.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configuração"}
      </button>
    </form>
  );
}
