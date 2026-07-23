import { NextResponse } from "next/server";
import { getActiveSsoConfig } from "@/lib/samlify";

export const dynamic = "force-dynamic";

// Endpoint público e "seguro" (não expõe certificado/segredos) usado pela
// tela /login para decidir se mostra o botão "Entrar com SSO" e se deve
// esconder o formulário de senha.
export async function GET() {
  const config = await getActiveSsoConfig();
  return NextResponse.json({
    enabled: Boolean(config),
    disablePasswordLogin: config?.disablePasswordLogin ?? false,
  });
}
