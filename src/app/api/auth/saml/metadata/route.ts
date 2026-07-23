import { buildServiceProvider } from "@/lib/samlify";

// Metadados do Service Provider (BiTool) — usados para configurar a
// integração no lado do IdP (EntraID/Okta) em /admin/sso.
export async function GET() {
  const sp = buildServiceProvider();
  return new Response(sp.getMetadata(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
