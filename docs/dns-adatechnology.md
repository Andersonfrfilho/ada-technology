<!--
Copyright (c) 2026 Ada Technology. All rights reserved.

This source code is proprietary and confidential. Unauthorized copying,
modification, distribution, or use of this file, via any medium, is
strictly prohibited without prior written permission from Ada Technology.
-->

# Zona `adatechnology.com.br`

Estado desejado da zona. Hoje ela responde pelo HostGator (`dns3`/`dns4.hostgator.com.br`), que
resolve tudo **menos o apex**. Este documento existe para que a zona seja conferivel e portavel: DNS
sem estado declarado em algum lugar viraja folclore na primeira vez que alguem mexe.

## Por que o apex nao fecha no HostGator

O Railway entrega dominio proprio via CNAME e nao publica IP fixo — apontar um `A` para o IP de hoje
quebraria sozinho no dia em que a borda rotacionar. E CNAME na raiz e proibido pelo RFC 1034: a raiz
obriga a existir `SOA` e `NS`, e um CNAME nao pode coexistir com outro registro no mesmo nome. Nao e
limitacao do painel do HostGator nem do Railway; e do protocolo.

O Netlify resolvia porque tinha IP proprio e estavel (`75.2.60.5`), bastando um `A`. Provedores com
**CNAME flattening** (Cloudflare, entre outros) fazem o mesmo do lado do DNS: aceitam a declaracao
de CNAME na raiz e respondem um `A` resolvido na hora, sem violar o RFC.

Enquanto o apex nao fechar, o site atende em `www`.

## Registros

`api`, `painel` e `www` sao producao; `staging`, `api.staging` e `painel.staging` sao o ambiente de
teste. Os alvos `*.up.railway.app` mudam se o dominio for recriado no Railway — a fonte da verdade
e `./scripts/railway-domains.py`.

```zone
$TTL 3600

; --- producao ---
api                             CNAME  og7vskjq.up.railway.app.
painel                          CNAME  owfxqhzz.up.railway.app.
www                             CNAME  5kducmcs.up.railway.app.

; --- staging ---
staging                         CNAME  47v0gmnt.up.railway.app.
api.staging                     CNAME  4x08kd1i.up.railway.app.
painel.staging                  CNAME  y9klqgw9.up.railway.app.

; --- posse dos dominios no Railway (secao 5 de deploy-railway.md) ---
_railway-verify                 TXT    "railway-verify=58aac9853837c728c1802b044015223c8d6b9a10c504535cc8fbeaa2d91093d9"
_railway-verify.api             TXT    "railway-verify=01d9f95c2a79af673a098255762b78fa110d47b045c92a8e0dea581fe400b0ef"
_railway-verify.painel          TXT    "railway-verify=e96209ddc062b4fb8c4787f494f4e664581926380313db6e34f92e82d61996aa"
_railway-verify.www             TXT    "railway-verify=177ca659a5e89f2bae7129255c468e99214bf638cbbace1dbc7f7a5eb151bc22"
_railway-verify.staging         TXT    "railway-verify=d646300e0ec8a939b08061589f4e69221d7b9f7b0f1bedc3376ac1b9a9edfe20"
_railway-verify.api.staging     TXT    "railway-verify=9c6c34650bb1ef37fd779c2e72895179cc37a609193875327985dbd582153659"
_railway-verify.painel.staging  TXT    "railway-verify=077fbad36be3a31b995cf0035fd370682d37a59985ec84467dfb5f8451fbdf23"

; --- e-mail (Zoho) ---
@                               MX     10 mx.zoho.com.
@                               MX     20 mx2.zoho.com.
@                               MX     50 mx3.zoho.com.
@                               TXT    "v=spf1 include:zohomail.com ~all"
@                               TXT    "zoho-verification=zb90721601.zmverify.zoho.com"
zoho._domainkey                 TXT    "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApD6IlVyLUt1gXUlLmb0L03yVPKfMLb59kopjITSCHPHtg6HD1JrydxmFSTtmNgie34ztmSo+NtZg61fq0NI0QsZusCKUZ9mnoWdYgpRLrjEifedBVNc71BL6EJKeDTVDiREbsIBjspd7el7wTJwQYDxvlzaQxGyxnR7u9ZIbAXwpXaBb2PZxbArBavTAw/zn8yOHOCYqy6jQ9tZ+SmKBi3wtLuTahInjrVJeTbGBsZfA/BQ1aD7f4YjkACOiiZjwzK2jyn5bfMzNJ12HKL2uskqUWcIV5SW966FAEtTb4t5ZTKMqdEKPi4QTlmSlxz6jkRnO/1LZYK+KZ3pUZ+Z61wIDAQAB"

; --- outros ---
@                               TXT    "openai-domain-verification=dv-fhcH4F8xUlbhZnMZDiJtaWiF"
```

O apex **nao aparece no arquivo de proposito**: `@ CNAME` e invalido em arquivo de zona, e um
importador correto rejeita. Ele e adicionado a mao no painel do provedor com flattening:

```
@  CNAME  2n9j9uyy.up.railway.app.
```

## Divergencias da zona atual (10/08/2026)

| Registro | Situacao | Acao |
|---|---|---|
| `A @ 75.2.60.5` | resquicio do Netlify; o projeto de la ja foi removido | remover — e o que faz o Chrome mostrar `ERR_CERT_COMMON_NAME_INVALID`, porque a borda do Netlify responde com o certificado `*.netlify.app`. Sozinha, a remocao apenas troca o sintoma por "site nao encontrado": o apex depende do provedor de DNS |

Dois itens ja foram corrigidos na zona e viraram o estado declarado acima: o `TXT` de verificacao do
Zoho, que tinha dois valores colados num campo com aspa escapada no meio, e os `MX` secundarios
`mx2` (20) e `mx3` (50), que nao existiam — sem eles, indisponibilidade do primario adia ou devolve
e-mail em vez de cair no proximo.

Nunca houve SPF duplicado, apesar da aparencia: pelo RFC 7208 §4.5, registro que nao comeca com
`v=spf1` e descartado, e o malformado comecava com `zoho-verification=`.

## Se a zona for para a Cloudflare

- Todos os registros ficam **DNS only** (nuvem cinza). Proxy ligado poe um segundo CDN na frente do
  Railway e atravessa a validacao ACME, que e o que emite o certificado do proprio Railway.
- O import aproveita o bloco acima; o apex entra a mao, depois.
- Trocar os nameservers no `registro.br` e o unico passo que nao da para automatizar.
- Confira o resultado com `./scripts/railway-domains.py`: a coluna `certificado` do apex sai de
  `ownership` para `valid` sozinha, alguns minutos depois de o CNAME resolver.
