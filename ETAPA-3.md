# Exportações — 2 de outubro de 2026

## Entrega

- Prévia isolada para impressão e PDF, em A4, 18 mm nas laterais e 22 mm inferiores.
- Conteúdo editado é a fonte da exportação. Menus, controles de edição e histórico ficam fora.
- Margens pertencem à página, não apenas ao fim do documento. Parágrafos extensos podem continuar na página seguinte; títulos evitam ficar sozinhos.
- Download Word `.docx` para planejamentos e atividades: parágrafos, títulos, negrito, itálico, sublinhado, listas textuais e tabelas editáveis.
- Nomes de arquivo com tipo, turma, disciplina e período do documento aberto.
- Planilha SGE mantém os nomes das abas e a ordem dos cabeçalhos existentes no Assistente.
- Código BNCC permanece no texto das habilidades. Não preenche automaticamente os identificadores internos do SGE.
- Identificadores SGE opcionais, informados conscientemente pelo professor.
- Conferência obrigatória no modal; qualquer edição invalida a confirmação anterior. A planilha permanece com Status Revisar.

## Referência SGE conferida

Repositório marianojogos-art/Assistente-SGE, revisão `461b58de350890e7589d632469cf726801bee6d8`, arquivo `assistente-sge-2.0.35/workbook-template.mjs`.
O nome histórico da pasta não indica, por si só, a versão instalada pelo usuário.
Cabeçalhos conferidos: Planejamento Quinzenal (20 colunas) e Planejamento Trimestral (9 colunas).
Não houve transferência de dados ao SGE nem modificação da extensão.

## Testes e limites

Testes verificam ZIP/partes DOCX, conteúdo completo, XML escapado, estilos, tabelas, margens, nomes de arquivo e esquema XLSX.
Também cobrem confirmação, preservação de turma com zero inicial, códigos BNCC e identificadores SGE separados.
Editor revalidado por testes de versões e salvamento concorrente. Corrigida a reutilização indevida de ID local de documento legado na criação de um novo.
Conexão à inspeção visual do navegador indisponível nesta sessão.
Ainda necessários: abrir Word no programa de destino, conferir paginação na janela de impressão e importar a planilha na instalação real do Assistente.
PDF usa “Salvar como PDF” do navegador; não é um serviço pago de conversão nem novo uso da IA.
