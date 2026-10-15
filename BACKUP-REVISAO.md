# Backup completo · 15/10/2026

## Diagnóstico e compatibilidade

A importação geral de `app.js` rejeitava arquivos acima de 2 MiB, importava apenas os primeiros 200 documentos e ignorava silenciosamente documentos inválidos. Também modificava o estado das turmas antes de terminar a validação e gravava documentos separadamente de configurações, usando uma rotina que ocultava falhas de armazenamento.

O checkout estava limpo. A consulta ao GitHub encontrou `d74880a` na `main`; a alteração de texto justificado foi integrada por avanço direto e preservada. Não foi encontrado `AGENTS.md` na árvore ou nos diretórios superiores. O escopo desta entrega é somente o backup geral de turmas/documentos; o backup separado das correções e a consulta remota do histórico não foram alterados.

## Comportamento

- Importação limitada a 20 MiB, verificada antes de ler o arquivo. Sem limite artificial de 200 documentos nem cortes de textos, habilidades ou versões.
- Arquivos versão 1 e legados sem versão continuam aceitos. Arquivos antigos sem `documents` restauram somente as turmas/configurações. Formatos desconhecidos, JSON inválido, listas malformadas, documentos inválidos ou turmas com IDs repetidos rejeitam o arquivo inteiro, com localização do problema.
- Todos os documentos são validados antes de qualquer gravação. HTML atual e HTML das versões passam pelo sanitizador existente. Avaliações e demais metadados de conteúdo permanecem nos documentos.
- Documentos atuais são preservados. Reimportar a mesma identidade e o mesmo conteúdo é idempotente. Mesmo ID com conteúdo diferente gera uma cópia local independente. Documentos distintos com IDs distintos não são descartados apenas por terem texto parecido.
- Turmas iguais são reutilizadas. Conflitos de ID entre turmas diferentes recebem novo ID, com remapeamento do `class_id` dos documentos. As habilidades são reunidas sem cortes.
- A restauração limpa vínculos remotos dos documentos importados e não executa sincronização. Importar um arquivo não sobrescreve documentos na nuvem. Proteções de conta impedem trocar de conta durante a leitura ou sobrescrever dados locais pertencentes a outra conta.
- Sucesso e erro aparecem de forma persistente na janela, sem fechamento automático. O relatório mostra documentos recebidos, adicionados, já existentes, total local, turmas adicionadas e conflitos preservados.
- A exportação captura o estado atual e todos os documentos locais, sem solicitar sincronização. Não converte um histórico local corrompido em um backup vazio. Exportações acima de 20 MiB continuam completas, com aviso explícito de que excedem o limite de importação.

## Gravação e limites de recuperação

O estado em memória só muda depois das duas gravações locais concluírem. As gravações são síncronas, sem `await` entre elas. Falha de quota ou de uma escrita reverte as chaves que já foram alteradas aos valores exatos anteriores, inclusive a ausência original de uma chave. A falha é informada sem mensagem falsa de sucesso.

`localStorage` não oferece transações entre chaves. Esta proteção cobre as falhas tratadas pela operação, mas não promete atomicidade contra encerramento abrupto do processo, queda do navegador entre instruções ou escrita concorrente de outra aba. Se o próprio navegador também recusar a reversão, a interface informa a falha, mantém em memória os dois valores originais e oferece uma cópia de recuperação para download; a página deve permanecer aberta até baixá-la. Essa cópia contém os valores brutos das chaves e destina-se à recuperação assistida. O limite de arquivo não amplia a quota de armazenamento do navegador.

## Verificação

Somente dados gerados, mocks e perfis isolados de navegador, sem dados pessoais ou chamadas pagas:

- `npm test`, incluindo `tests/backups.mjs`: exportação/restauração de 240 documentos em mais de 2 MiB, versões e avaliação preservadas, roundtrip, reimportação, documentos sem identidade legada, conflitos, arquivo inválido após os primeiros 200 itens, conta divergente/trocada durante leitura, limite de tamanho antes da leitura, histórico local corrompido, falhas na primeira e segunda gravações, reversão de chaves ausentes e download de recuperação quando a reversão também falha.
- `npm run test:review`, `npm run test:assessments`, `npm run test:transcription`: regressões dos fluxos existentes.
- `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs npm run test:backups:browser`: página real no Chromium, upload/download de mais de 2 MiB e 230 documentos, HTML sanitizado, versões, reimportação, rejeição completa e reversão de quota simulada. Todas as requisições externas foram bloqueadas.
- `npm run build`: 32 arquivos públicos, sintaxe/JSON/referências locais validados; testes e documentação fora dos assets publicados.
- `git diff --check`.

Publicação autorizada para a `main` de `marianojogos-art/Carijo`, pela integração Cloudflare existente **Workers Builds: gaviao**, exclusivamente no destino `https://gaviao.carijo.workers.dev/`. Marcador de release: `2026-10-15-backup`. O resultado da implantação e seu SHA devem ser conferidos no check do commit antes de informar sucesso.
