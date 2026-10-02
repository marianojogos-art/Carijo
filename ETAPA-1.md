# Carijó — primeira etapa da revisão

Implementado em 1 de outubro de 2026.

## Entrada e planejamento

- Quatro acessos principais: planejamento, atividade/avaliação, correção e documentos.
- Correção por câmera está explicitamente identificada como próxima etapa, sem simular funcionamento.
- Entrada direta por disciplina, ano e carga horária, ou escolha de turma existente.
- Ensino Fundamental do 1º ao 9º ano; opções secundárias recolhidas.
- Habilidades oficiais incluídas por padrão no trimestral, removíveis pelo professor.
- Trimestre de 12 semanas apenas para dimensionamento da carga; seis seções pedagógicas, texto fluido e sem divisão semanal.
- Textos operacionais claros; sátira na identidade, crítica e aviso de custos.
- Conta opcional por e-mail e senha; geração não depende de cadastro no código novo.
- Documentos podem ser salvos, abertos, duplicados e excluídos neste dispositivo sem conta. Backup inclui os documentos locais.

## Servidor

A função nova `generate-plan-public` foi preparada com geração, supervisor interno e reescrita. Uma sessão só mantém um pedido pendente. Não há cota mensal nem teto financeiro. O identificador de sessão é um identificador técnico, não autenticação ou proteção contra abuso distribuído.

A tabela `carijo_generation_runs` foi criada no projeto existente, com RLS e acesso somente pelo serviço. Guarda metadados de consumo, sem texto do pedido. Nenhum registro antigo foi apagado.

A implantação inicial foi rejeitada pela revisão automática por risco financeiro. Após confirmação explícita do responsável, a função `generate-plan-public` foi implantada em 2 de outubro de 2026 e está ACTIVE, versão 1, sem exigência de JWT. A função existente `generate-plan` foi preservada, inclusive o atendimento do Assistente SGE.

Testes reais, sem login: atividade e planejamento trimestral responderam HTTP 200 com `gpt-5.6-luna`. O planejamento concluiu elaboração, supervisão e aprimoramento, com as seis seções e sem divisão semanal. Tokens foram registrados. O custo monetário estimado retornou nulo porque os preços não estão configurados; nulo não significa custo zero.

O resumo diário de custos, a área administrativa, o editor completo, as versões, a recuperação de pedidos interrompidos e a leitura/correção de avaliações pertencem às próximas etapas.

## Verificação e prévia

Executar `npm test` com Node 24. Testes cobrem seleção curricular, concorrência, cancelamento, entrada direta, histórico local e servidor com IA simulada. Não consomem a API paga.

Executar `node tests/preview-server.mjs` e abrir http://localhost:3000/.

A publicação do frontend foi realizada em 2 de outubro de 2026, commit `4f64cbb18e0373518f6e7d7fa840c8bac7855316`. O GitHub acionou automaticamente o build do Worker `gaviao`. O endereço público respondeu HTTP 200 com a identificação desta versão, os quatro acessos e a chamada à função `generate-plan-public`. A conferência visual no navegador ficou pendente por falha da conexão de automação; os testes de fluxo e estrutura são programáticos.

Foram publicados somente `app.js`, `index.html` e `styles.css`, preservando os demais arquivos do repositório, inclusive a exportação SGE. A atualização preservou o commit anterior `b6b9053680f62dea21faa80d5b3e25dc74b92437`; não foi usado force-push. A revisão da exportação para o Assistente 2.0.74 permanece para a etapa própria.
