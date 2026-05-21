# Auditoria de estabilidade — Tradução ao vivo

## Diagnóstico

O app já tem uma base forte: usa Gemini Live API para tradução ao vivo, mantém histórico limitado, possui reconexão preventiva, pesquisa em REST separada e cronômetro local. O problema principal não é falta de feature. O problema é acoplamento de estados em um fluxo realtime muito sensível.

Hoje o mesmo hook concentra:

- captura de microfone;
- envio de áudio PCM;
- WebSocket Gemini Live;
- input transcription;
- output transcription;
- roteamento A/B;
- contexto recente;
- pesquisa;
- playback de áudio;
- supressão de microfone durante fala do app;
- reconexão;
- UI state.

Isso aumenta a chance de o tradutor se perder quando há mudança rápida de falantes, pesquisa no meio da sessão, reconexão ou frases curtas.

## Pontos de risco atuais

### 1. Roteamento por detecção heurística

A função `detectBase(text)` tenta inferir PT, EN ou IT por palavras e acentos. Isso é útil, mas frágil em frases curtas como:

- "ok"
- "yes"
- "bene"
- "aqui"
- "assim"
- "mais duas"
- "right"
- "dai"

Risco: a fala pode cair no painel errado ou o output pode ser direcionado para o lado errado.

### 2. Input e output compartilham estado de turno

Estados como `inputAccumRef`, `outputAccumRef`, `lastInputLangRef` e `outputTargetRef` determinam para onde cada transcrição vai. Se o Gemini fragmenta input/output ou se há interrupção, o estado pode ficar incoerente.

### 3. Pesquisa depende do turnComplete da mesma sessão live

O modo pesquisa usa `searchModeRef` para capturar a próxima fala, mas a captura ainda depende dos eventos de `inputTranscription` e `turnComplete` do WebSocket live. Se o Gemini demorar, fragmentar ou não fechar turno corretamente, a pesquisa pode ficar presa ou capturar texto errado.

### 4. Reconexão injeta contexto recente no system prompt

A reconexão usa `recentContextText()` dentro do novo system prompt. Isso ajuda continuidade, mas também pode poluir o comportamento se o contexto contiver fragmentos, pesquisa, tradução parcial ou entradas mal roteadas.

### 5. Supressão de microfone é temporal

`suppressMicUntilRef` reduz eco do áudio falado pelo app. Funciona, mas se o áudio demorar mais que o previsto ou se o usuário falar junto, pode cortar fala real ou permitir eco.

## Contratos técnicos obrigatórios

### TRANSLATE

- É o modo padrão.
- Deve apenas traduzir.
- Não deve pesquisar.
- Não deve executar comandos.
- Não deve interpretar cronômetro.
- Deve manter o par de idiomas selecionado.
- Deve ignorar interjeições curtas.

### SEARCH

- Ativado somente pelo botão de pesquisa.
- Deve capturar apenas uma pergunta.
- Deve usar REST separado.
- Deve falar o resultado em áudio separado.
- Deve voltar automaticamente ao modo TRANSLATE.
- Não deve contaminar o histórico usado para continuidade do tradutor.

### TIMER

- É apenas UI local.
- Não usa Gemini.
- Não pausa tradução.
- Não altera WebSocket.
- Não entra no histórico.

### RECONNECT

- Deve reiniciar o WebSocket sem apagar sessão visual.
- Deve usar contexto curto e limpo.
- Não deve incluir resultados de pesquisa no contexto de tradução.
- Não deve repetir saudação ou instruções.

## Correções recomendadas por prioridade

### Prioridade 1 — Criar estado explícito de sessão

Adicionar um `sessionModeRef` formal:

```js
const SESSION_MODE = {
  TRANSLATE: 'translate',
  SEARCH_ARMED: 'search_armed',
  SEARCH_PROCESSING: 'search_processing',
};
```

Substituir `searchModeRef` solto por transições explícitas:

- `enterTranslateMode()`
- `enterSearchArmedMode()`
- `enterSearchProcessingMode()`
- `returnToTranslateMode()`

### Prioridade 2 — Separar histórico de UI do contexto de reconexão

Criar dois históricos:

- `uiHistoryRef`: tudo que aparece na tela;
- `continuityHistoryRef`: apenas falas/traduções confiáveis de tradução.

Pesquisa não entra em `continuityHistoryRef`.

### Prioridade 3 — Bloquear pesquisa de contaminar turno

Quando entrar em SEARCH:

- limpar `inputAccumRef`;
- limpar `outputAccumRef`;
- limpar `outputTargetRef`;
- capturar pergunta em buffer separado;
- depois de buscar, não chamar `pushHistory` do tradutor.

### Prioridade 4 — Melhorar roteamento de lado

Criar função única:

```js
resolveSpeakerSideFromText(text, config, fallbackSide)
```

Ela deve retornar side + confiança:

```js
{ side: 'A' | 'B' | null, confidence: 0..1, base: 'pt'|'en'|'it'|null }
```

Se confiança baixa, usar fallback do último falante ou esperar mais texto.

### Prioridade 5 — Sanitizar contexto recente

`recentContextText()` deve ignorar:

- entradas `isSearch`;
- fragmentos muito curtos;
- interjeições;
- outputs incompletos;
- duplicados;
- itens com baixa confiança.

## Testes manuais obrigatórios

1. PT-BR → IT: falar 5 frases de treino seguidas.
2. IT → PT-BR: aluno responde 5 frases.
3. Alternância rápida PT/IT sem pesquisa.
4. Botão pesquisa → pergunta → resposta falada → retorno automático à tradução.
5. Pesquisa durante sessão ativa sem cair no histórico de tradução.
6. Reconexão após 8–9 minutos mantendo contexto, sem saudar nem explicar.
7. Cronômetro rodando durante tradução sem interferir.
8. EN-US e EN-GB gerando vocabulário/voz diferentes.

## Decisão

O próximo código deve atacar primeiro a separação de estados e histórico. Não redesenhar UI. Não trocar modelo. Não adicionar novas features. Estabilizar o core realtime.