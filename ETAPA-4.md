# Avaliações, correção local e administração

## Recursos implementados

- Geração real de avaliações estruturadas, com formatos e perfis disciplinares existentes, complexidade, contexto, acessibilidade e composição de questões.
- Questões objetivas, abertas e tarefas com rubricas; pontuações e respostas editáveis. Respostas esperadas não aparecem no material do estudante.
- Gabarito separado para o professor, folha de respostas para leitura óptica e variantes com alternativas embaralhadas sem nova chamada à IA.
- Aprovação explícita do gabarito, invalidada após edições. Folhas antigas são rejeitadas quando a avaliação ou o gabarito muda.
- Cadastro por matrícula e nome, separado por turma, importação com escolha da aba `Notas T…` do Assistente SGE e folhas com código identificador do estudante. O código também verifica a matrícula, evitando a reutilização acidental de um identificador para outra pessoa.
- Leitura local pela câmera ou foto, quatro marcas de alinhamento, ajuste de orientação e marcação manual dos cantos. Respostas duplas, em branco e incertas exigem conferência.
- Questões abertas com rubrica e pontos atribuídos pelo professor. OCR local opcional para auxiliar na transcrição, sem nota automática e sem enviar imagens à IA.
- Correções confirmadas, reabertura, exclusão, cópia local de segurança e prévia das notas antes de exportar XLSX. Matrículas preservadas como texto; status inicial “Revisar”. Nenhum envio ao SGE.
- Painel administrativo: intervalo, usuários identificados, visitantes agregados, modelos, consumo diário, tokens, cache, falhas, custos conhecidos/desconhecidos, câmbio informado e exportação CSV.
- Configuração de preços por modelo/vigência, com fonte oficial e registro de auditoria. Custos são estimativas, não valores conciliados com a fatura.

## Servidor

`generate-plan-public` aceita `outputFormat: "assessment"` com esquema JSON estrito e validação semântica. `admin-dashboard` verifica o token e a tabela privada `carijo_administrators` no servidor. Ambas fazem validação manual apropriada; o painel não depende de informações de papel fornecidas pelo navegador.

`supabase/admin-setup.sql` cria somente a estrutura administrativa e adiciona metadados ao registro de consumo. Nenhum administrador é escolhido automaticamente. Nenhuma chave de serviço ou da OpenAI deve ser colocada no navegador ou neste repositório.

Preços ausentes permanecem desconhecidos. A contabilização inclui as chamadas de supervisão e melhoria e registra o uso conhecido mesmo em falhas. Registros históricos não têm seus preços ou autores adivinhados retroativamente. Visitantes sem conta não podem ser acompanhados individualmente entre sessões.

## Privacidade e operação

Estudantes, respostas, notas e imagens ficam neste navegador. A cópia de segurança contém dados pessoais e deve ser protegida. OCR e leitor de XLSX baixam dependências apenas quando acionados. Tesseract recebe a imagem localmente, no navegador; não há envio de imagem a serviço de reconhecimento.

A geração permanece pública, conforme decisão do projeto. O painel acompanha custos, mas não transforma acesso livre em cota ou login obrigatório.

## Verificação

Testes automatizados: validação das questões e rubricas, isolamento do gabarito, cálculo de notas, pendências, códigos de folha, rejeição de versões erradas, marcação dupla em imagem sintética, transformação de perspectiva, custos desconhecidos, planilha com cabeçalho e matrícula, autorização do painel, esquema estruturado e regressões dos fluxos anteriores.

Foi realizada uma chamada real pequena ao modelo configurado, retornando uma questão objetiva e uma aberta. A função administrativa sem sessão respondeu 401. Falta validação de campo com folha impressa e câmera de celular: iluminação, reflexos, foco e escrita manual podem prejudicar a leitura. OCR não garante transcrição de manuscritos.

Faltam duas configurações humanas: indicar a conta administrativa e registrar preços oficiais do modelo. Não preencher com e-mail presumido nem valores inventados.

## Fontes técnicas

- [Saída estruturada da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs)
- [API do Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Segurança das Edge Functions](https://supabase.com/docs/guides/functions/auth)

## Testes

Executar os testes existentes de `package.json` e os novos `tests/assessments.mjs`, `tests/admin-security.mjs`, `tests/workspace-loading.mjs`, `tests/roster-import.mjs` e `tests/public-generation.mjs`. Os testes usam modelos simulados e não consomem créditos, exceto a chamada real manual descrita acima.
