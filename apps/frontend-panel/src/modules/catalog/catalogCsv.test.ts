/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, test } from 'bun:test';

import { parseCatalogCsv } from '@/modules/catalog/catalogCsv';

describe('parseCatalogCsv', () => {
  test('casa o cabecalho da planilha com o campo do modulo, sem acento nem caixa', () => {
    expect(parseCatalogCsv('Nome,PREÇO,Estoque\nCafeteira,199990,4')).toEqual([
      { name: 'Cafeteira', price: '199990', inventory: '4' },
    ]);
  });

  test('descarta coluna que o modulo nao conhece, em vez de manda-la para ser recusada', () => {
    expect(parseCatalogCsv('nome,preco,fornecedor\nMesa,120,Acme')).toEqual([
      { name: 'Mesa', price: '120' },
    ]);
  });

  test('preserva virgula e aspas dentro do campo entre aspas', () => {
    expect(parseCatalogCsv('nome,descricao,preco\n"Kit 10","Caneca 300ml, ""grande""",89')).toEqual([
      { name: 'Kit 10', description: 'Caneca 300ml, "grande"', price: '89' },
    ]);
  });

  test('mantem quebra de linha dentro de aspas no mesmo registro', () => {
    expect(parseCatalogCsv('nome,descricao,preco\nMesa,"linha 1\nlinha 2",10')).toEqual([
      { name: 'Mesa', description: 'linha 1\nlinha 2', price: '10' },
    ]);
  });

  test('ignora linha vazia do fim do arquivo, que toda planilha exporta', () => {
    expect(parseCatalogCsv('nome,preco\nMesa,10\n\n')).toHaveLength(1);
  });

  test('arquivo sem conteudo nao vira linha nenhuma', () => {
    expect(parseCatalogCsv('')).toEqual([]);
  });
});
