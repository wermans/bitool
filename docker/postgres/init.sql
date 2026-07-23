-- Cria o banco de dados analítico separado dos metadados da aplicação
-- (que residem no banco padrão, gerenciado via Prisma).
CREATE DATABASE analytics;

\connect analytics;

CREATE TABLE IF NOT EXISTS public.vendas (
    id SERIAL PRIMARY KEY,
    produto VARCHAR(120) NOT NULL,
    regiao VARCHAR(60) NOT NULL,
    departamento VARCHAR(60) NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    data_venda DATE NOT NULL
);

INSERT INTO public.vendas (produto, regiao, departamento, valor, data_venda)
SELECT
    (ARRAY['Notebook', 'Monitor', 'Teclado', 'Mouse', 'Headset'])[1 + floor(random() * 5)::int],
    (ARRAY['BR-SP', 'BR-RJ', 'BR-MG', 'BR-RS'])[1 + floor(random() * 4)::int],
    (ARRAY['Varejo', 'Corporativo', 'E-commerce'])[1 + floor(random() * 3)::int],
    round((random() * 4500 + 50)::numeric, 2),
    CURRENT_DATE - (floor(random() * 180)::int)
FROM generate_series(1, 500);
