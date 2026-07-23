import { prisma } from "@/lib/prisma";
import { AttributesClient } from "./attributes-client";

export const dynamic = "force-dynamic";

export default async function AdminAttributesPage() {
  const attributes = await prisma.userAttribute.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Atributos de RLS</h2>
        <p className="text-sm text-muted-foreground">
          Definições de atributos (ex.: region, department) usadas para Row-Level
          Security. Os valores por usuário são preenchidos em cada
          usuário e repassados ao Cube.js como securityContext.userAttributes.
        </p>
      </div>
      <AttributesClient
        initialAttributes={attributes.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          defaultValue: a.defaultValue,
        }))}
      />
    </div>
  );
}
