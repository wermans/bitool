import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";
import { SsoForm } from "./sso-form";

export const dynamic = "force-dynamic";

export default async function AdminSsoPage() {
  const config = await prisma.ssoConfig.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const appUrl = getAppUrl();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">SSO / SAML</h2>
        <p className="text-sm text-muted-foreground">
          Configure a integração SAML (EntraID, Okta ou genérico). Use os
          dados abaixo para registrar este app como Service Provider no IdP.
        </p>
      </div>

      <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <div>
          <span className="font-medium">SP Entity ID / Metadata: </span>
          <code>{appUrl}/api/auth/saml/metadata</code>
        </div>
        <div>
          <span className="font-medium">ACS URL (Assertion Consumer Service): </span>
          <code>{appUrl}/api/auth/callback/saml</code>
        </div>
      </div>

      <SsoForm
        initialConfig={
          config
            ? {
                provider: config.provider,
                entityId: config.entityId,
                ssoLoginUrl: config.ssoLoginUrl,
                ssoLogoutUrl: config.ssoLogoutUrl ?? "",
                certificate: config.certificate,
                metadataUrl: config.metadataUrl ?? "",
                attributeMapping:
                  (config.attributeMapping as {
                    email?: string;
                    name?: string;
                  }) ?? {},
                allowedDomains: config.allowedDomains,
                isEnabled: config.isEnabled,
                disablePasswordLogin: config.disablePasswordLogin,
              }
            : null
        }
      />
    </div>
  );
}
