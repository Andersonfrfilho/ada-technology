/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { CSV_COLUMN_BY_HEADER } from '@/modules/catalog/catalog.constant';

export type CatalogCsvRow = Readonly<Record<string, string>>;

/**
 * Le o CSV que o operador exportou da planilha e devolve as linhas que o modulo espera.
 *
 * O cabecalho e casado sem acento e sem caixa porque a mesma planilha sai como "Preço", "preco" e
 * "PREÇO" dependendo de quem exportou; coluna desconhecida e descartada aqui, em vez de subir para
 * a API so para ser recusada linha a linha.
 */
export function parseCatalogCsv(text: string): readonly CatalogCsvRow[] {
  const [headerLine, ...lines] = splitRecords(text);
  if (!headerLine) return [];

  const columns = splitCells(headerLine).map((header) => CSV_COLUMN_BY_HEADER[normalize(header)]);

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = splitCells(line);
      const row: Record<string, string> = {};

      columns.forEach((column, index) => {
        const value = cells[index]?.trim();
        if (column && value) row[column] = value;
      });

      return row;
    })
    .filter((row) => Object.keys(row).length > 0);
}

/** Quebra de linha dentro de aspas faz parte do valor, e nao separa registro. */
function splitRecords(text: string): readonly string[] {
  const records: string[] = [];
  let current = '';
  let isQuoted = false;

  for (const char of text.replace(/\r\n/g, '\n')) {
    if (char === '"') isQuoted = !isQuoted;
    if (char === '\n' && !isQuoted) {
      records.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (current.length > 0) records.push(current);
  return records;
}

function splitCells(record: string): readonly string[] {
  const cells: string[] = [];
  let current = '';
  let isQuoted = false;

  for (let index = 0; index < record.length; index += 1) {
    const char = record[index];

    if (char === '"') {
      if (isQuoted && record[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }
      isQuoted = !isQuoted;
      continue;
    }

    if (char === ',' && !isQuoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char ?? '';
  }

  cells.push(current);
  return cells;
}

function normalize(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); 
}
