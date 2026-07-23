import { NextResponse } from "next/server";
import {
  getActiveSsoConfig,
  buildServiceProvider,
  buildIdentityProvider,
  getAppUrl,
} from "@/lib/samlify";

export const dynamic = "force-dynamic";

// SP-initiated login: redireciona o browser para o IdP configurado em SsoConfig.
export async function GET() {
  const config = await getActiveSsoConfig();
  if (!config) {
    return NextResponse.redirect(`${getAppUrl()}/login?error=SsoNotConfigured`);
  }

  const sp = buildServiceProvider();
  const idp = buildIdentityProvider(config);
  const { context } = sp.createLoginRequest(idp, "redirect");

  return NextResponse.redirect(context);
}
