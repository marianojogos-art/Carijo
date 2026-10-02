# Revisão final, recuperação e acompanhamento

## Entregas

- Conferência documental atualizada após edição: seções, evidência textual das habilidades (inclusive sem código), carga de referência, sequência e datas não solicitadas. A análise pedagógica interna já existente permanece. A lista não certifica adequação à turma ou autenticidade bibliográfica.
- Geração recuperável com identificador idempotente e credencial aleatória. O navegador não salva o prompt no comprovante. O servidor guarda o resultado por 24 horas, nega acesso após esse prazo e limpa o conteúdo a cada 15 minutos. Não há cota nem exigência de login. Pedidos antigos sem credencial continuam síncronos, por compatibilidade.
- Reenvio do mesmo pedido e consulta do resultado pronto não chamam a IA outra vez. Falhas não são reiniciadas automaticamente. Execução em segundo plano ainda depende dos limites da plataforma: não é uma fila durável com garantia de conclusão.
- Questões abertas: transcrição por questão, pontuação de cada critério, soma com validação, sugestão local de devolutiva baseada nas pontuações, texto editável, rascunhos locais e impressão individual. O professor atribui a nota; respostas não são enviadas à IA.
- Alertas de falhas, custo estimado e medição desconhecida/incompleta. Preferências locais, atualização optativa a cada minuto e notificações optativas enquanto o painel estiver aberto. Não há envio de e-mail em segundo plano.
- Melhorias de foco, atalho ao conteúdo, movimento reduzido, controles, telas pequenas, rubricas e ocultação de elementos auxiliares na impressão.

## Privacidade e operação

O comprovante privado fica neste navegador: não compartilhe armazenamento/cópias em computadores públicos. Apagá-lo não cancela o trabalho nem devolve gastos. As respostas dos estudantes continuam locais, assim como suas cópias de segurança.

O painel administrativo seleciona apenas colunas de consumo: nunca credenciais de recuperação ou documentos. A tabela de recuperação mantém RLS e não concede acesso a visitantes/contas comuns. A limpeza programada usa cron restrito.

Os avisos de segurança preexistentes do projeto (políticas de proprietário que também abrangem contas anônimas e proteção contra senhas vazadas desativada) não foram alterados: não são uma garantia de auditoria integral do projeto.

## Verificação

Testes simulados, sem gastos reais: idempotência, execução em segundo plano, segredo incorreto, expiração, geração antiga, cálculo de rubricas, alertas, carregamento das áreas, exportação, câmera sintética e persistência. Teste físico de câmera/celular e inspeção visual no navegador continuam necessários.
