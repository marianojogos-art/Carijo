# Carijó

## Planejamentos, supervisão e Assistente SGE

O trimestral considera 12 semanas para calcular a carga, mas apresenta texto contínuo, sem divisão semana a semana e sem três eixos obrigatórios. Habilidades ficam selecionadas por padrão; o professor pode retirar, acrescentar complementos sem BNCC e carregar habilidades anteriores. A cobertura depende da integridade do catálogo local RMEF.

A função pública produz um rascunho, solicita análise interna de supervisão e reescreve o documento. A análise não aparece ao usuário e não equivale à aprovação institucional. A geração é livre, sem login obrigatório ou cota mensal; o servidor registra consumo e evita pedidos simultâneos da mesma sessão.

A saída XLSX segue os cabeçalhos e nomes de abas do Assistente SGE 2.0, verificados no projeto local de 31/08/2026 (`workbook-template.mjs` e `workflows/legacy-controller.js`). O gerador XLSX foi reaproveitado desse projeto, com células de texto literais. A aba quinzenal inclui cinco campos pedagógicos e habilidades; referências são preservadas em Metodologia. A trimestral inclui o documento em Conteúdo do Período. O exportador pede o código real da turma e permite conferir os textos. A planilha sai como Criar/Revisar; para registro existente, ajustar para Atualizar e informar a sequência no SGE. Importe a aba na planilha conectada ao Assistente e confirme manualmente o lançamento. Datas trimestrais ficam vazias, pois as 12 semanas não determinam datas do calendário.

O site https://gaviao.carijo.workers.dev/ é publicado a partir de `main` no repositório `marianojogos-art/Carijo`, pelo Cloudflare Worker `gaviao`, com `npx wrangler deploy`, sem compilação prévia. `wrangler.toml` preserva o nome do Worker. `.assetsignore` exclui funções de servidor, testes, documentação e configurações dos arquivos públicos. Versionar código Supabase no GitHub não o executa nem o publica no Supabase.

## Avaliações, versões e origem pedagógica

“Criar atividade / avaliação deste planejamento” herda a turma, habilidades e contexto registrados. O professor escolhe o recorte, desmarca habilidades ou continua com uma criação independente. A origem e sua versão ficam registradas no instrumento.

As versões guardam texto, questões, gabarito, pontuação e rubricas conjuntamente. Restaurar retira a aprovação e cria nova identidade, impedindo a reutilização silenciosa de folhas antigas. Versões legadas sem questões não permitem correção óptica.

Gabarito e rubricas do professor são separados do material do estudante. A folha identificada admite leitura local por câmera ou foto, com conferência de ambiguidades. Questões abertas possuem rubricas e pontos atribuídos pelo professor; OCR auxilia a transcrição, sem nota automática. Não há transferência direta ao SGE. Confira o contrato da versão instalada do Assistente antes de importar a planilha.

Aplicação web de apoio ao planejamento docente, com seleção da Matriz de Referência Curricular da RMEF 2026, geração por IA, atividades e avaliações, editor, histórico e exportação por impressão/PDF.

## Desenvolvimento local

Sirva esta pasta por HTTP (por exemplo, em `http://localhost:3000`). Abrir o arquivo diretamente com `file://` prejudica autenticação, funções remotas e redirecionamentos OAuth.

Com Node.js recente, execute `npm test` e `npm run test:assessments`. Os testes usam IA simulada e não consomem créditos. Use `npm run preview` para a prévia HTTP. Ainda é necessária homologação com celular, impressão física, Word e importação no Assistente. Consulte as entregas em `ETAPA-1.md` a `ETAPA-5.md`.

## Serviços

- Supabase Auth: conta opcional de e-mail/senha para sincronizar histórico privado.
- Supabase Database: turmas, preferências, histórico privado e registros de consumo.
- Supabase Edge Functions atuais: `generate-plan-public` e `admin-dashboard`. A administração exige autenticação e autorização no servidor. O diretório `generate-plan` conserva código legado usado por testes.
- OpenAI Responses API: chamada somente no servidor, com `store: false`; a chave nunca é entregue ao navegador.

As chaves privadas e a seleção de modelo permanecem nos secrets do Supabase. O painel administrativo acompanha usuários e visitantes, tokens, falhas e custos estimados por preços configurados. Estimativas não são a fatura do provedor. Funções e scripts SQL exigem revisão e publicação separada; não execute scripts de banco automaticamente no deploy do site.

## Segurança e privacidade

Não inclua nomes, diagnósticos ou dados identificáveis de estudantes nos pedidos de IA ou nos documentos sincronizados. Cadastro, fotos, respostas, transcrições e notas de correção ficam no navegador. Backups de correção são privados e não devem ser enviados ao GitHub. Documentos e versões são salvos localmente; uma conta opcional permite sincronizá-los no histórico privado. As chaves privadas permanecem exclusivamente nas Edge Functions.

Antes de publicar uma nova versão, execute o teste, confira os avisos de segurança do Supabase e valide login, uma geração, salvamento, reabertura, edição e impressão/PDF.
