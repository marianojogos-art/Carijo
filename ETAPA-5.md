# Etapa 5 — integridade das avaliações e origem pedagógica

Implementação local em 2 de outubro de 2026. Não exige migração nem alteração das funções de geração.

## Documento e gabarito na mesma versão

- Cada checkpoint registra uma cópia independente da avaliação estruturada, junto com HTML e texto. Alterações só no gabarito também criam checkpoints.
- Restaurar uma versão recupera as questões, respostas, rubricas, pontuação e origem correspondentes. A aprovação é retirada e uma nova identidade impede o uso silencioso de folhas antigas.
- Versões legadas, sem estrutura, recuperam apenas o documento e não herdam o gabarito atual. Não permitem correção óptica.
- Alterar texto livre invalida a aprovação antes do salvamento; aplicar o editor de questões reconstitui o documento coerente. Aprovação também é salva no histórico.
- O limite permanece: original e 29 versões recentes. Avaliações com muitas questões ocupam mais armazenamento local.

## Planejamento → atividade / avaliação

- Botão no resultado: “Criar atividade / avaliação deste planejamento”. Usa o texto atual, inclusive alterações do professor, e a versão capturada.
- O formulário também oferece planejamentos salvos neste dispositivo. Documentos da conta podem ser abertos no histórico e usados pelo botão do resultado.
- Herda turma, ano, disciplina, trimestre, habilidades, duração, recursos e contexto registrados. Dados ausentes em documentos antigos não são inventados.
- As habilidades herdadas ficam selecionadas, inclusive complementos sem BNCC. O professor pode retirar qualquer uma e delimitar conteúdos, objetivos ou aulas no campo de recorte.
- A origem, versão, seleção e recorte ficam registrados na avaliação. Alterações posteriores no planejamento não alteram a avaliação existente.
- Mudar turma, ano ou trimestre remove o vínculo ativo para não misturar contextos. A criação independente permanece disponível.
- Não há nova chamada à API ao preparar o formulário, restaurar versões ou editar questões. A geração usa a chamada já existente.
- Não há coleta nova de dados de estudantes nem alterações nas permissões do histórico.

## Verificação

Testes de versões, persistência, origem pedagógica e fluxo de avaliação com DOM simulado; testes existentes de currículo, exportação, câmera sintética, custos e segurança. Sem chamadas pagas de IA.

Conferência visual no navegador não concluída: a conexão de automação apresentou falha ao iniciar. Publicação pelo GitHub/Cloudflare preparada após a implementação; o marcador de versão é `2026-10-02-avaliacoes-etapa-5`.
