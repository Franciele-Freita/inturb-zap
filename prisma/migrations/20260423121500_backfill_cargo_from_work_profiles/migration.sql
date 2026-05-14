WITH normalized_profiles AS (
    SELECT
        trim("cargoName") AS cargo_name,
        CASE
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('OPERACIONAL', 'TECNICO', 'ADMINISTRATIVO', 'LIDERANCA', 'GESTAO', 'ESTRATEGICO')
                THEN upper(trim("cargoLevel"))
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('AUXILIAR', 'AUX', 'ASSISTENTE')
                THEN 'OPERACIONAL'
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('ANALISTA', 'TECNICA')
                THEN 'TECNICO'
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('SUPERVISOR', 'COORDENADOR', 'SUPERVISAO', 'COORDENACAO', 'TATICO')
                THEN 'LIDERANCA'
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('GERENCIA', 'GERENCIAL', 'GERENTE')
                THEN 'GESTAO'
            WHEN upper(coalesce(nullif(trim("cargoLevel"), ''), '')) IN ('DIRETOR', 'DIRETORIA')
                THEN 'ESTRATEGICO'
            ELSE NULL
        END AS normalized_level
    FROM "WorkProfileTemplate"
    WHERE trim("cargoName") <> ''
),
grouped AS (
    SELECT
        cargo_name,
        COALESCE(
            max(normalized_level) FILTER (WHERE normalized_level IS NOT NULL),
            'OPERACIONAL'
        ) AS cargo_level,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT normalized_level), NULL) AS normalized_levels
    FROM normalized_profiles
    GROUP BY cargo_name
)
INSERT INTO "Cargo" (
    "id",
    "name",
    "description",
    "department",
    "level",
    "levels",
    "cboCode",
    "cboTitle",
    "unhealthyAllowance",
    "hazardousAllowance",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('cargo_bf_', substring(md5(g.cargo_name || '|Operacoes') from 1 for 18)),
    g.cargo_name,
    NULL,
    'Operacoes',
    g.cargo_level,
    CASE
        WHEN cardinality(g.normalized_levels) > 0 THEN to_jsonb(g.normalized_levels)
        WHEN g.cargo_level IN ('LIDERANCA', 'GESTAO', 'ESTRATEGICO') THEN '["Senior"]'::jsonb
        ELSE '["Junior", "Pleno", "Senior"]'::jsonb
    END,
    NULL,
    NULL,
    'NONE',
    'NONE',
    TRUE,
    NOW(),
    NOW()
FROM grouped g
ON CONFLICT ("name", "department") DO NOTHING;

UPDATE "WorkProfileTemplate" w
SET
    "cargoId" = c."id",
    "cargoLevel" = CASE
        WHEN coalesce(trim(w."cargoLevel"), '') <> '' THEN w."cargoLevel"
        WHEN jsonb_typeof(c."levels") = 'array' AND jsonb_array_length(c."levels") > 0 THEN c."levels" ->> 0
        ELSE w."cargoLevel"
    END
FROM "Cargo" c
WHERE w."cargoId" IS NULL
  AND trim(w."cargoName") = c."name"
  AND c."department" = 'Operacoes';
