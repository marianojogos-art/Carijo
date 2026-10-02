# Etapa 6 — gabarito compacto e captura automática

- Novas folhas têm 160 mm de largura e altura proporcional à quantidade de questões objetivas. As marcas inferiores ficam próximas ao fim das respostas, não ao fim da página em branco.
- O código identifica explicitamente o modelo compacto (versão 3). Folhas anteriores (versão 2) continuam legíveis. Essa distinção evita aplicar uma geometria errada quando duas folhas têm dimensões semelhantes.
- Ao abrir, a câmera é centralizada na tela, com limite de altura para celular, orientação visual e estado de leitura acessível. Há nova centralização após o vídeo carregar.
- A leitura local ocorre a cada 350 ms. São necessárias três leituras compatíveis, com código válido e posição estável por pelo menos 700 ms. Não basta encontrar um retângulo.
- A captura automática é confirmada novamente na imagem de maior resolução; verifica avaliação, cadastro e matrícula. A câmera então para e mostra estudante, nota ou pendências.
- Respostas ambíguas, em branco e questões abertas permanecem pendentes. A leitura não salva nem envia notas: o professor precisa conferir e confirmar.
- “Ler próximo gabarito” abre e centraliza a câmera novamente. Captura manual, carregamento de foto e alinhamento manual continuam disponíveis.
- Trocar a avaliação ou turma, sair da página, ocultar o navegador ou desligar a câmera interrompe a detecção. Uma autorização de câmera atrasada não reabre uma sessão cancelada.
- Nenhuma foto é enviada à API ou nuvem. Não há custo de IA na leitura óptica.

Testes: compactação, 30 questões, folhas antigas, rotação, estabilidade, perda das marcas, apresentação do resultado, centralização, encerramento da câmera, não salvamento automático e autorização atrasada. Validação com imagens sintéticas e DOM simulado; ainda requer homologação física com celular, papel, iluminação e permissão reais.
