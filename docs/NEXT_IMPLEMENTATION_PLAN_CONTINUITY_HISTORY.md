# Plano de implementação — Separar histórico visual e histórico de continuidade

## Objetivo

Impedir que pesquisa, fragmentos fracos, textos curtos, outputs parciais ou itens de UI contaminem o contexto enviado ao Gemini após reconexão.

## Problema atual

O app usa `historyLogRef` tanto para:

1. histórico visual/operacional da sessão;
2. construção de `recentContextText()` para o system prompt em reconexões.

Isso cria risco porque nem tudo que aparece ou passa pela UI deve virar contexto semântico do tradutor.

## Mudança necessária

Criar dois históricos separados:

```js
const uiHistoryRef = React.useRef([]);
const continuityHistoryRef = React.useRef([]);
```

### uiHistoryRef

Pode conter:

- falas originais;
- traduções;
- resultados de pesquisa;
- itens exibidos na interface;
- entradas úteis para debug visual.

### continuityHistoryRef

Deve conter apenas:

- fala original confiável;
- tradução confiável;
- sem pesquisa;
- sem timer;
- sem comandos;
- sem texto muito curto;
- sem duplicatas;
- sem fragmentos ruins.

## Funções novas recomendadas

```js
function isContinuitySafe(entry) {
  if (!entry || !entry.text) return false;
  if (entry.isSearch) return false;
  const text = entry.text.trim();
  if (text.length < 8) return false;
  if (/^(ok|okay|sì|si|yes|no|não|sim|uhum|hm|yeah)$/i.test(text)) return false;
  return true;
}

function pushUiHistory(entry, replaceLast) {
  // substitui ou adiciona no histórico visual
}

function pushContinuityHistory(entry, replaceLast) {
  if (!isContinuitySafe(entry)) return;
  // substitui ou adiciona no histórico semântico
}

function pushHistory(entry, replaceLast) {
  pushUiHistory(entry, replaceLast);
  pushContinuityHistory(entry, replaceLast);
}
```

## Alteração em recentContextText()

Trocar:

```js
historyLogRef.current.slice(-MAX_CONTEXT_ENTRIES)
```

por:

```js
continuityHistoryRef.current.slice(-MAX_CONTEXT_ENTRIES)
```

## Alteração em resetTranscriptionState()

Deve limpar os dois históricos:

```js
uiHistoryRef.current = [];
continuityHistoryRef.current = [];
```

## Alteração em getHistory()

Deve continuar retornando histórico visual:

```js
getHistory: () => uiHistoryRef.current.slice()
```

## Pesquisa

`addSearchResult()` pode continuar mostrando resultado na UI, mas NÃO deve entrar em continuityHistoryRef.

## Critério de pronto

1. Tradução normal continua aparecendo na UI.
2. Pesquisa aparece na UI e fala em áudio.
3. Pesquisa não entra no contexto de reconexão.
4. Reconexão usa apenas histórico limpo.
5. Cronômetro não entra em nenhum histórico semântico.
6. `getHistory()` mantém comportamento visual atual.

## Validação manual

1. Iniciar PT-BR ↔ IT.
2. Falar frases reais de treino.
3. Usar pesquisa.
4. Forçar reconexão ou aguardar reconexão preventiva.
5. Confirmar que o tradutor não repete resultado da pesquisa nem muda comportamento.

## Decisão

Essa mudança deve ser pequena e focada. Não mexer em UI, prompts principais ou Gemini model nesta etapa.