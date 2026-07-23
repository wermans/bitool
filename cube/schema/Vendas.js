cube(`Vendas`, {
  sql: `SELECT * FROM public.vendas`,

  // RLS dinâmico: o filtro só é aplicado se o SECURITY_CONTEXT trouxer o
  // atributo "region" (ver USER_CONTEXT em cube.js). Usuários sem restrição
  // (ex.: admin) recebem um contexto vazio e enxergam todas as linhas.
  sqlAlias: `vendas`,

  joins: {},

  measures: {
    count: {
      type: `count`,
    },
    receitaTotal: {
      sql: `valor`,
      type: `sum`,
      format: `currency`,
    },
    ticketMedio: {
      sql: `valor`,
      type: `avg`,
      format: `currency`,
    },
  },

  dimensions: {
    id: {
      sql: `id`,
      type: `number`,
      primaryKey: true,
    },
    produto: {
      sql: `produto`,
      type: `string`,
    },
    regiao: {
      sql: `regiao`,
      type: `string`,
    },
    departamento: {
      sql: `departamento`,
      type: `string`,
    },
    dataVenda: {
      sql: `data_venda`,
      type: `time`,
    },
  },

  // Pré-agregações nativas do Cube (materializadas em Cube Store) — aceleram
  // as consultas do Explorer/Dashboards sem que o Next.js precise cachear nada.
  preAggregations: {
    vendasPorDiaRegiao: {
      type: `rollup`,
      measures: [Vendas.receitaTotal, Vendas.count, Vendas.ticketMedio],
      dimensions: [Vendas.regiao, Vendas.departamento],
      timeDimension: Vendas.dataVenda,
      granularity: `day`,
      refreshKey: {
        every: `1 hour`,
      },
    },
  },
});
