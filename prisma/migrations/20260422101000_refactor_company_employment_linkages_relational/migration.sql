-- CreateTable
CREATE TABLE "CompanyEmploymentLinkage" (
  "id" TEXT NOT NULL,
  "companyProfileId" TEXT NOT NULL,
  "key" "WorkProfileContractType" NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyEmploymentLinkage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmploymentLinkageRule" (
  "id" TEXT NOT NULL,
  "companyEmploymentLinkageId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "settings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyEmploymentLinkageRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmploymentLinkage_companyProfileId_key_key"
ON "CompanyEmploymentLinkage"("companyProfileId", "key");

-- CreateIndex
CREATE INDEX "CompanyEmploymentLinkage_companyProfileId_sortOrder_key_idx"
ON "CompanyEmploymentLinkage"("companyProfileId", "sortOrder", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_code_key"
ON "CompanyEmploymentLinkageRule"("companyEmploymentLinkageId", "code");

-- CreateIndex
CREATE INDEX "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_isActive_prio_idx"
ON "CompanyEmploymentLinkageRule"("companyEmploymentLinkageId", "isActive", "priority");

-- AddForeignKey
ALTER TABLE "CompanyEmploymentLinkage"
ADD CONSTRAINT "CompanyEmploymentLinkage_companyProfileId_fkey"
FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfileConfig"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmploymentLinkageRule"
ADD CONSTRAINT "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_fkey"
FOREIGN KEY ("companyEmploymentLinkageId") REFERENCES "CompanyEmploymentLinkage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill relational records from legacy JSON column, with defaults when missing.
WITH defaults AS (
  SELECT *
  FROM (
    VALUES
      ('CLT'::"WorkProfileContractType", 'CLT', 'Regime celetista com jornada fixa e beneficios completos.', 1),
      ('CLT_INTERMITENTE'::"WorkProfileContractType", 'CLT Intermitente', 'Regime por convocacao com pagamento por periodo trabalhado.', 2),
      ('MEI'::"WorkProfileContractType", 'MEI', 'Prestador microempreendedor individual com emissao fiscal.', 3),
      ('PJ'::"WorkProfileContractType", 'PJ', 'Prestador pessoa juridica com contrato de servicos.', 4),
      ('AUTONOMO'::"WorkProfileContractType", 'Autonomo', 'Prestacao eventual sem vinculo empregaticio formal.', 5)
  ) AS t("key", "label", "description", "sortOrder")
),
prepared AS (
  SELECT
    ('cel_' || md5(random()::text || clock_timestamp()::text || c."id" || d."key"::text)) AS "id",
    c."id" AS "companyProfileId",
    d."key",
    LEFT(
      COALESCE(
        NULLIF(BTRIM(linkage.value->>'label'), ''),
        d."label"
      ),
      80
    ) AS "label",
    LEFT(
      COALESCE(
        NULLIF(BTRIM(linkage.value->>'description'), ''),
        d."description"
      ),
      240
    ) AS "description",
    CASE
      WHEN linkage.value IS NOT NULL AND jsonb_typeof(linkage.value->'isActive') = 'boolean'
        THEN (linkage.value->>'isActive')::boolean
      ELSE true
    END AS "isActive",
    CASE
      WHEN linkage.value IS NOT NULL
        AND jsonb_typeof(linkage.value->'sortOrder') = 'number'
        THEN LEAST(GREATEST((linkage.value->>'sortOrder')::integer, 1), 99)
      ELSE d."sortOrder"
    END AS "sortOrder",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
  FROM "CompanyProfileConfig" c
  CROSS JOIN defaults d
  LEFT JOIN LATERAL (
    SELECT elem AS value
    FROM jsonb_array_elements(COALESCE(c."employmentLinkages", '[]'::jsonb)) elem
    WHERE elem->>'key' = d."key"::text
    LIMIT 1
  ) linkage ON true
)
INSERT INTO "CompanyEmploymentLinkage" (
  "id",
  "companyProfileId",
  "key",
  "label",
  "description",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "companyProfileId",
  "key",
  "label",
  "description",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
FROM prepared
ON CONFLICT ("companyProfileId", "key") DO NOTHING;
