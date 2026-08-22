# Rest Timer Non-Interference Contract

## Objetivo

O cronômetro de descanso é uma ferramenta visual/local da interface. Ele não faz parte da sessão Gemini Live, não muda o modo do tradutor, não pausa microfone, não altera WebSocket, não envia mensagens ao modelo e não deve contaminar o contexto de tradução.

## Comportamento esperado

1. O usuário escolhe o tempo de descanso antes da sessão.
2. Durante a sessão ativa, o botão `Cronômetro` inicia apenas um contador visual no canto da tela.
3. O usuário continua falando normalmente enquanto o Gemini traduz em tempo real.
4. Quando o tempo termina, o app emite apenas um alerta local curto:
   - vibração quando disponível;
   - beep local via Web Audio API quando permitido pelo navegador.
5. Após o alerta, a tradução continua exatamente como estava.

## Regras técnicas obrigatórias

- Não chamar Gemini para iniciar, atualizar ou finalizar o cronômetro.
- Não usar `translator.pause()`.
- Não usar `translator.resume()`.
- Não chamar `sendAudioStreamEnd()`.
- Não fechar nem reabrir WebSocket.
- Não alterar `searchMode`.
- Não alterar idioma ativo.
- Não inserir texto do timer em `transA`, `transB` ou histórico.
- Não usar TTS Gemini para avisar fim do timer.

## Teste manual mínimo

1. Iniciar sessão PT-BR ↔ IT.
2. Falar uma frase em português e confirmar tradução em italiano.
3. Tocar em `Cronômetro`.
4. Continuar falando durante a contagem.
5. Confirmar que o app continua traduzindo durante o cronômetro.
6. Ao fim, confirmar apenas beep/vibração.
7. Continuar falando e confirmar tradução normal após o alerta.

## Decisão

O cronômetro é estado local de UI, não estado conversacional.