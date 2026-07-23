// Configuração do Cube.js — camada única de caching/performance da plataforma.
// O Next.js NUNCA cacheia dados de query aqui; apenas repassa o contexto de
// segurança (JWT com os UserAttributes do Postgres) em cada requisição.
//
// RLS dinâmico: o token JWT enviado pelo app carrega um `securityContext` com
// os UserAttributes do usuário autenticado (ex.: { region: ["BR-SP","BR-RJ"] }).
// `queryRewrite` injeta esses valores como filtros obrigatórios nas queries.

module.exports = {
  contextToAppId: ({ securityContext }) =>
    `CUBE_APP_${securityContext?.projectId || "default"}`,

  queryRewrite: (query, { securityContext }) => {
    const attributes = securityContext?.userAttributes || {};

    Object.entries(attributes).forEach(([attributeName, values]) => {
      // Convenção: um UserAttribute "region" restringe a dimensão
      // "<Cube>.regiao" quando o cube consultado expõe essa dimensão.
      if (!Array.isArray(values) || values.length === 0) return;

      const dimensionMap = {
        region: "regiao",
        department: "departamento",
      };
      const dimensionSuffix = dimensionMap[attributeName];
      if (!dimensionSuffix) return;

      const targetCubes = new Set(
        [...(query.measures || []), ...(query.dimensions || [])].map((m) =>
          m.split(".")[0]
        )
      );

      targetCubes.forEach((cubeName) => {
        query.filters = (query.filters || []).concat([
          {
            member: `${cubeName}.${dimensionSuffix}`,
            operator: "equals",
            values,
          },
        ]);
      });
    });

    return query;
  },

  // Cache/queue e pré-agregações materializam nativamente em Cube Store
  // (CUBEJS_CACHE_AND_QUEUE_DRIVER=cubestore, definido no docker-compose).
};
