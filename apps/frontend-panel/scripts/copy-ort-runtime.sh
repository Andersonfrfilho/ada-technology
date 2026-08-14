#!/usr/bin/env bash
#
# Copyright (c) 2026 Ada Technology. All rights reserved.
#
# Coloca o bundle e o runtime WASM do onnxruntime-web em `public/ort/`, de onde o Vite ja serve em
# dev e copia no build. O bundle e carregado por `<script>` em runtime, fora do grafo de modulos:
# sem isto a biblioteca buscaria os arquivos no CDN dela — dependencia externa em producao, e um
# `connect-src` a mais no CSP.
#
# Os arquivos nao vao para o git: sao ~90MB que o `bun install` ja traz, e versionar copia de
# dependencia e como elas divergem.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${APP_DIR}/node_modules/onnxruntime-web/dist"
TARGET_DIR="${APP_DIR}/public/ort"

if [ ! -d "${SOURCE_DIR}" ]; then
  echo "onnxruntime-web nao instalado em ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_DIR}"/ort.wasm.min.js "${SOURCE_DIR}"/*.wasm "${SOURCE_DIR}"/*.mjs "${TARGET_DIR}/"
