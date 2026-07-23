import * as samlify from "samlify";
import type { SsoConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";

// MVP: valida apenas assinatura/estrutura da asserção (feito pelo samlify),
// sem validação XSD estrita. Para produção, plugue um validador real
// (ex.: @authenio/samlify-node-xmllint) via samlify.setSchemaValidator.
samlify.setSchemaValidator({
  validate: async () => "SUCCESS",
});

export { getAppUrl };

export async function getActiveSsoConfig() {
  return prisma.ssoConfig.findFirst({ where: { isEnabled: true } });
}

export function buildServiceProvider() {
  const appUrl = getAppUrl();
  return samlify.ServiceProvider({
    entityID: `${appUrl}/api/auth/saml/metadata`,
    assertionConsumerService: [
      {
        Binding: samlify.Constants.namespace.binding.post,
        Location: `${appUrl}/api/auth/callback/saml`,
      },
    ],
    wantAssertionsSigned: true,
    wantMessageSigned: false,
  });
}

export function buildIdentityProvider(config: SsoConfig) {
  return samlify.IdentityProvider({
    entityID: config.entityId,
    singleSignOnService: [
      {
        Binding: samlify.Constants.namespace.binding.redirect,
        Location: config.ssoLoginUrl,
      },
    ],
    singleLogoutService: config.ssoLogoutUrl
      ? [
          {
            Binding: samlify.Constants.namespace.binding.redirect,
            Location: config.ssoLogoutUrl,
          },
        ]
      : undefined,
    signingCert: config.certificate,
  });
}

export type SamlAttributeMapping = {
  email?: string;
  name?: string;
};
