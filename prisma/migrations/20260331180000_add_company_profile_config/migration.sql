CREATE TABLE "CompanyProfileConfig" (
  "id" TEXT NOT NULL,
  "legalName" TEXT NOT NULL DEFAULT 'Inturb Plataforma de Mobilidade LTDA',
  "tradeName" TEXT NOT NULL DEFAULT 'Inturb',
  "cnpj" TEXT,
  "phone" TEXT,
  "email" TEXT NOT NULL DEFAULT 'operacao@inturb.local',
  "website" TEXT,
  "zipCode" TEXT,
  "street" TEXT,
  "number" TEXT,
  "neighborhood" TEXT,
  "city" TEXT,
  "state" TEXT,
  "legalRepresentativeName" TEXT,
  "legalRepresentativeCpf" TEXT,
  "legalRepresentativeRole" TEXT,
  "contractSignatureCity" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyProfileConfig_pkey" PRIMARY KEY ("id")
);
