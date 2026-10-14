# Transcrição de imagens · revisão local de 14/10/2026

## Diagnóstico e escopo

- Trabalho realizado somente no ambiente de nuvem, em `/workspace/Carijo`.
- Checkout inicial limpo, branch local `work`, sem upstream. `git fetch origin` consultou `marianojogos-art/Carijo`; `HEAD` e `origin/main` estavam no SHA `385d27df0afbf564ada9d0be49d87d3bbfd184a1` (comparação `0 0`). Não foi necessária integração. Nenhum `AGENTS.md` foi encontrado na árvore ou nos diretórios superiores.
- Painel identificado em `correction-ui.mjs`, com Tesseract local em `local-readers.mjs`. A implementação anterior exibia a imagem separada do texto, permitia transferir o OCR sem revisão e descartava metadados de confiança. Carregar uma foto no leitor de gabaritos reiniciava a resposta em edição.
- Escopo limitado ao apoio à transcrição e sua passagem para as questões abertas. Nenhum novo provedor, modelo, credencial, dependência de produção ou serviço. Sem alterações no leitor óptico, nos critérios de pontuação ou no banco remoto.

## Alterações

- `transcription-review.mjs`: área com foto e texto lado a lado no desktop e empilhados no celular; imagem com ampliação de até 300% e rolagem própria, sem alterar a geometria do canvas de OMR.
- Carregamento próprio para respostas escritas, mantendo estudante, respostas e questão em edição. Limite de 20 MB; cópia de conferência limitada a 3.200 pixels no maior lado. A foto oriunda do leitor óptico mantém a resolução já reduzida pelo fluxo existente (até 1.800 pixels).
- Ao abrir a conferência ou iniciar upload/OCR, a câmera é pausada para evitar a troca automática da foto durante a revisão.
- O texto retornado pelo OCR é preservado, incluindo espaços, zeros iniciais, números, respostas e quebras de linha. Não há correção ortográfica automática, preenchimento de respostas ou renumeração. O editor permite substituir uma seleção por `[ilegível]`.
- Palavras com confiança abaixo de 70, ou sem valor numérico válido, aparecem como leituras incertas para comparação. O valor é uma heurística do OCR, não uma medida de acerto; não identifica toda omissão ou trecho ilegível. A ausência de metadados também é informada. Nenhum candidato é tratado como resposta confirmada.
- Estados de preparação, reconhecimento, conclusão, ausência de texto, erro e cancelamento. Erros e cancelamentos preservam o texto anterior; substituição de texto ou foto própria pede confirmação. Mudanças de foto/contexto invalidam a revisão, e resultados/progresso atrasados são ignorados. O worker é encerrado ao terminar, falhar ou cancelar; se ainda estiver inicializando, é encerrado quando a inicialização retornar.
- A transcrição e sua foto permanecem em memória até a associação explícita. O botão da questão exige conferência marcada e texto não vazio de até 20.000 caracteres. Após a associação, somente o texto revisado entra no rascunho local existente; a foto não é persistida.
- Substituir resposta ou pontuação preexistente pede confirmação. Associar transcrição retira os pontos anteriores e a devolutiva, mantendo a atribuição de pontos manual. Editar o texto associado invalida sua revisão e seus pontos; persistência do rascunho, pontuação e confirmação final ficam bloqueadas até nova conferência. A versão anteriormente salva é preservada enquanto a edição não for revisada.
- Trocar estudante, turma, avaliação ou abrir outra correção limpa a transcrição temporária. É necessário carregar novamente a imagem correspondente; fotos não são recuperadas de rascunhos ou backups. Um rascunho de transcrição ainda não associado não é salvo ao sair/recarregar a página.

## Verificações

Executadas na nuvem, com fixtures sintéticas, mocks e armazenamento de navegador isolado:

- `npm test`: testes gerais, geração simulada, versões e exportação.
- `npm run test:review`: recuperação e ferramentas de revisão.
- `npm run test:assessments`: avaliações, leitor óptico com folhas sintéticas, câmera, cadastro simulado e regressões do painel.
- `npm run test:transcription`: preservação literal, baixa confiança, resultado vazio, falhas e descarte do worker, inclusive cancelamento durante inicialização/reconhecimento.
- `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs SCREENSHOT_DIR=/tmp/carijo-transcription-evidence npm run test:transcription:browser`: integração do painel real com a biblioteca de avaliações e OCR simulados; upload de PNG sintético, ausência de gravação antes da revisão, associação, invalidação ao editar, impedimento de confirmação, falhas, cancelamento, resultados atrasados, troca de contexto, zoom e layouts de 1.365 e 390 pixels. Todas as requisições externas são bloqueadas, e o teste exige zero tentativas.
- `npm run build`: empacotamento estático local de 31 arquivos públicos, validação de sintaxe JavaScript, JSON e referências locais, com manifesto SHA-256. A saída vai para uma pasta nova em `/tmp/carijo-static-*`, fora do checkout. Documentação, testes, arquivos ocultos, configurações e funções de servidor são excluídos.
- `git diff --check`: verificação de whitespace do diff.

As capturas de desktop e celular ficam em `/tmp/carijo-transcription-evidence/`. Testes preexistentes podem emitir avisos do Node sobre TypeScript experimental e tipo de módulo; não são falhas dos testes.

## Limitações e entrega

- A qualidade real do OCR, especialmente de manuscritos, não foi aferida: somente resultados simulados foram usados, conforme o escopo. Não se garante recuperação correta de números ou conteúdo que o próprio OCR tenha omitido; a comparação humana continua obrigatória.
- Nenhuma imagem de estudante, registro real, chamada paga ou nova credencial foi utilizada. As bibliotecas/idiomas do OCR existente não foram baixados nos testes. Não houve operação em serviço de produção.
- A primeira entrega permaneceu local, sem commit, push ou publicação. Mariano autorizou posteriormente a atualização do GitHub e a publicação no destino existente do Carijó, em 14/10/2026. A configuração identifica exclusivamente o Worker `gaviao` (`https://gaviao.carijo.workers.dev/`). O marcador de release é `2026-10-14-transcricao`.
- A publicação deve ser verificada separadamente: o build local não comprova implantação nem substitui homologação em celular físico. Nesta nuvem, a inspeção prévia não encontrou autenticação da Cloudflare e a URL pública retornou bloqueio de rede (HTTP 403 do proxy); o acesso Git ao repositório e o conector GitHub funcionaram.
