import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

type ImportOptions = {
  filePath: string;
  delimiter?: string;
  encoding?: string;
  source: string;
  dryRun: boolean;
};

type ParsedCboRow = {
  code: string;
  title: string;
  description?: string;
};

function parseArgs(argv: string[]): ImportOptions {
  let filePath = "";
  let delimiter: string | undefined;
  let encoding: string | undefined;
  let source = "CBO";
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--file" || arg === "-f") && argv[i + 1]) {
      filePath = argv[i + 1];
      i += 1;
      continue;
    }
    if ((arg === "--delimiter" || arg === "-d") && argv[i + 1]) {
      delimiter = argv[i + 1];
      i += 1;
      continue;
    }
    if ((arg === "--encoding" || arg === "-e") && argv[i + 1]) {
      encoding = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--source" && argv[i + 1]) {
      source = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
  }

  if (!filePath.trim()) {
    throw new Error(
      "Informe o arquivo com --file. Exemplo: pnpm cbo:import -- --file data/cbo.csv"
    );
  }

  return {
    filePath: filePath.trim(),
    delimiter: delimiter?.trim() || undefined,
    encoding: encoding?.trim() || undefined,
    source: source.trim() || "CBO",
    dryRun
  };
}

function resolveCsvEncoding(value?: string): BufferEncoding | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "utf8" || normalized === "utf-8") {
    return "utf8";
  }

  if (
    normalized === "latin1" ||
    normalized === "iso-8859-1" ||
    normalized === "iso8859-1" ||
    normalized === "windows-1252" ||
    normalized === "win1252" ||
    normalized === "cp1252"
  ) {
    return "latin1";
  }

  throw new Error(
    "Encoding invalido. Use utf8/utf-8 ou latin1/iso-8859-1/windows-1252."
  );
}

function decodeCsvBuffer(buffer: Buffer, encodingOverride?: string): string {
  if (buffer.length === 0) {
    return "";
  }

  const resolvedEncoding = resolveCsvEncoding(encodingOverride);
  if (resolvedEncoding) {
    return buffer.toString(resolvedEncoding).replace(/^\uFEFF/, "");
  }

  const hasUtf8Bom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;

  if (hasUtf8Bom) {
    return buffer.toString("utf8").replace(/^\uFEFF/, "");
  }

  const utf8Decoded = buffer.toString("utf8");
  if (!utf8Decoded.includes("\uFFFD")) {
    return utf8Decoded.replace(/^\uFEFF/, "");
  }

  return buffer.toString("latin1").replace(/^\uFEFF/, "");
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(line: string): string {
  const candidates = [";", ",", "\t", "|"];
  let bestDelimiter = ";";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const parts = parseDelimitedLine(line, delimiter);
    if (parts.length > bestScore) {
      bestScore = parts.length;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function normalizeCboCode(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  const normalizedRaw = raw.replace(/\./g, "-").replace(/\//g, "-");
  if (/^\d{4}-\d{2}$/.test(normalizedRaw)) {
    return normalizedRaw;
  }

  return raw;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function readCboRows(
  filePath: string,
  delimiterOverride?: string,
  encodingOverride?: string
): Promise<ParsedCboRow[]> {
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Arquivo nao encontrado: ${absolutePath}`);
  }

  const rawBuffer = readFileSync(absolutePath);
  const content = decodeCsvBuffer(rawBuffer, encodingOverride);
  const lines = content.split(/\r?\n/);

  const rowsByCode = new Map<string, ParsedCboRow>();
  let delimiter = delimiterOverride;
  let headerParsed = false;
  let hasHeader = false;
  let codeIndex = 0;
  let titleIndex = 1;
  let descriptionIndex = -1;

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (!delimiter) {
      delimiter = detectDelimiter(line);
    }
    const columns = parseDelimitedLine(line, delimiter);

    if (!headerParsed) {
      headerParsed = true;
      const normalizedHeaders = columns.map((item) => normalizeHeader(item));
      const potentialCodeIndex = normalizedHeaders.findIndex((item) =>
        ["codigo", "codigocbo", "cbo", "codocupacao", "codigoocupacao"].includes(item)
      );
      const potentialTitleIndex = normalizedHeaders.findIndex((item) =>
        ["titulo", "ocupacao", "nome", "nomeocupacao", "descricaoocupacao"].includes(item)
      );
      const potentialDescriptionIndex = normalizedHeaders.findIndex((item) =>
        ["descricao", "descricaosumaria", "descricaoanalitica", "detalhe"].includes(item)
      );

      if (potentialCodeIndex >= 0 && potentialTitleIndex >= 0) {
        hasHeader = true;
        codeIndex = potentialCodeIndex;
        titleIndex = potentialTitleIndex;
        descriptionIndex = potentialDescriptionIndex;
        continue;
      }
    }

    const sourceColumns = columns;
    const codeValue = sourceColumns[codeIndex] ?? "";
    const titleValue = sourceColumns[titleIndex] ?? "";
    const descriptionValue =
      descriptionIndex >= 0 ? sourceColumns[descriptionIndex] ?? "" : "";

    const code = normalizeCboCode(codeValue);
    const title = normalizeText(titleValue);
    const description = normalizeText(descriptionValue);

    if (!code || !title) {
      continue;
    }

    const existing = rowsByCode.get(code);
    if (!existing) {
      rowsByCode.set(code, {
        code,
        title,
        description: description || undefined
      });
      continue;
    }

    const shouldReplace =
      title.length > existing.title.length ||
      (!existing.description && Boolean(description));
    if (shouldReplace) {
      rowsByCode.set(code, {
        code,
        title,
        description: description || existing.description
      });
    }
  }

  const rows = [...rowsByCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  if (rows.length === 0) {
    throw new Error(
      hasHeader
        ? "Nenhum registro CBO valido encontrado no arquivo."
        : "Arquivo lido, mas nao foi possivel identificar registros CBO validos."
    );
  }

  return rows;
}

async function importCboRows(rows: ParsedCboRow[], options: ImportOptions): Promise<void> {
  const prisma = new PrismaClient();
  const startedAt = Date.now();

  try {
    const allCodes = rows.map((row) => row.code);
    const existingCodes = new Set<string>();

    for (const codeChunk of chunkArray(allCodes, 1000)) {
      const existing = await prisma.cboOccupation.findMany({
        where: { code: { in: codeChunk } },
        select: { code: true }
      });
      for (const item of existing) {
        existingCodes.add(item.code);
      }
    }

    const plannedCreate = rows.filter((row) => !existingCodes.has(row.code)).length;
    const plannedUpdate = rows.length - plannedCreate;

    console.log(`[CBO] Arquivo processado: ${rows.length} registros validos`);
    console.log(`[CBO] Criacoes previstas: ${plannedCreate}`);
    console.log(`[CBO] Atualizacoes previstas: ${plannedUpdate}`);
    console.log(`[CBO] Fonte: ${options.source}`);

    if (options.dryRun) {
      console.log("[CBO] Dry-run ativo: nenhuma alteracao foi gravada.");
      return;
    }

    for (const rowChunk of chunkArray(rows, 300)) {
      await prisma.$transaction(
        rowChunk.map((row) =>
          prisma.cboOccupation.upsert({
            where: { code: row.code },
            create: {
              code: row.code,
              title: row.title,
              description: row.description ?? null,
              source: options.source,
              isActive: true
            },
            update: {
              title: row.title,
              description: row.description ?? null,
              source: options.source,
              isActive: true
            }
          })
        )
      );
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[CBO] Importacao concluida em ${elapsedMs}ms.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const rows = await readCboRows(options.filePath, options.delimiter, options.encoding);
  await importCboRows(rows, options);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[CBO] Falha na importacao: ${message}`);
  process.exitCode = 1;
});
