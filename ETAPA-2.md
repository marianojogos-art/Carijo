# Editor e histórico — 2 de outubro de 2026

- Atalhos por seção, preservação da seleção nas ferramentas e tabela editável 3 × 3.
- Salvamento local imediato das edições; sincronização com a conta após pausa de 1,2 segundo.
- Geração e nova geração registradas automaticamente, sem chamadas extras à IA.
- Original e 29 checkpoints recentes; recuperação cria uma nova versão.
- Comparação textual lado a lado com destaque das linhas alteradas.
- Metadados do documento antigo preservados mesmo sem a turma no formulário atual.
- Fila de salvamento evita inserções paralelas e resposta lenta não sobrescreve edição local.
- Histórico oferece cópias locais quando a conta está sem conexão; espelhos sincronizados não aparecem duplicados.
- Exclusão de documento da conta remove também seu espelho local.
- Versões ficam em `teacher_plans.plan_data`: nenhuma migração ou nova permissão.

## Verificação

Testes de sintaxe, entrada, geração, currículo, versões e persistência simulada passaram.
Testes de persistência cobrem inserções concorrentes, resposta lenta, checkpoints e troca de conta.
Controles não imprimíveis são excluídos por CSS; tabelas passam pelo sanitizador.
Inspeção visual no navegador e sincronização autenticada real ainda precisam de teste interativo.

## Limites

Cópias locais dependem do armazenamento deste navegador. Limpar dados do navegador as remove.
Em máquina compartilhada, use a conta pessoal e remova cópias locais ao encerrar.
Comparação indica linhas presentes/ausentes, não uma revisão semântica ou diferença palavra a palavra.
Desfazer/refazer utiliza o editor nativo do navegador; versões permitem recuperação persistente.
