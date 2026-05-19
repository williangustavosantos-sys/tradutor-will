# Tradutor Will — Documento completo do projeto

## 1. O que é o Tradutor Will

O **Tradutor Will** é um aplicativo web pensado para **sessões ao vivo de personal trainer** em que duas pessoas falam idiomas diferentes — em geral **português brasileiro** de um lado e **inglês** (ou italiano) do outro. Ele funciona como um **intérprete invisível**: não é um chatbot, não responde perguntas dirigidas a ele e não vira uma “terceira voz” na conversa. A única função é **ouvir o que cada um diz e devolver a tradução para o outro**, em tempo quase real, por **voz** e por **texto grande na tela**.

O nome reflete o uso prático: é a ferramenta do personal para treinar alunos estrangeiros sem precisar parar o treino a cada frase, abrir o Google Translate ou repetir tudo em gestos.

Tecnicamente é uma **PWA** (Progressive Web App): abre no navegador do celular (Safari, Chrome), pode ser instalada na tela inicial e usa a API **Gemini Live** do Google para tradução contínua por WebSocket, mais uma API REST separada para pesquisa na internet.

---

## 2. Para quem é e em que contexto se usa

### Público principal

- **Personal trainers** que atendem alunos que não falam português fluentemente.
- **Alunos** em viagem, intercâmbio ou treino com coach brasileiro.
- Qualquer dupla em ambiente de **treino físico** (academia, estúdio, ar livre) que precise de comunicação **mãos livres** ou com o celular no bolso / apoiado no chão.

### Contexto típico

Uma sessão dura cerca de **60 a 90 minutos**. Há instruções rápidas (“sobe a carga”, “mais duas”, “segura o core”), correções de postura, feedback de dor/cansaço e conversa informal. O app precisa aguentar **ruído**, **frases curtas**, **gírias de treino** e **pausas entre séries** — não um discurso formal de reunião.

---

## 3. Objetivo final do produto

O objetivo não é “traduzir documentos” nem “ensinar idiomas”. É:

1. **Manter o fluxo do treino** — o coach não interrompe a série para digitar; o aluno entende na hora o que fazer.
2. **Reduzir mal-entendidos** em comandos técnicos (agachamento, amplitude, cadência, dor, cansaço).
3. **Dar segurança** a quem treina em outro idioma (expressar “está doendo”, “não consigo”, “preciso descansar”).
4. **Funcionar num único celular** entre os dois, com layout pensado para cada um ler do seu lado da tela.
5. **Ser simples** — poucos botões, sem menus complexos, sem conta obrigatória além da chave de API configurada.

Em uma frase: **tornar possível um treino presencial bilíngue com a mesma naturalidade de um intérprete humano discreto ao lado.**

---

## 4. Como o app deve funcionar (comportamento esperado)

### 4.1 Antes da sessão (tela inicial)

O usuário configura:

| Opção | Função |
|--------|--------|
| **Eu falo** | Idioma do treinador (ex.: Português BR) |
| **Outra pessoa fala** | Idioma do aluno (ex.: English US/UK ou Italiano) |
| **Traduzir em áudio** | Se a tradução também sai falada pelo celular |
| **Voz feminina / masculina** | Preview da voz que lerá as traduções |
| **Descanso (seg)** | Tempo padrão do cronômetro entre séries (30–120 s) |

Ao tocar **Iniciar sessão**, o app:

- Pede permissão de **microfone**;
- Abre conexão **WebSocket** com o modelo Gemini Live;
- Envia um **prompt de sistema** especializado (intérprete + glossário de treino);
- Entra na tela de tradução ativa.

### 4.2 Durante a sessão (núcleo do produto)

A tela divide-se em **dois painéis** (idioma A e idioma B). Em cada um aparece, em **fonte grande**:

- O que foi **dito** naquele idioma;
- A **tradução** correspondente no outro painel.

**Entrada de fala (microfone)**  
O áudio do microfone é capturado em PCM 16 kHz, enviado em tempo real ao modelo. O sistema:

- Transcreve o que foi dito (`inputTranscription`);
- Gera tradução em áudio (`responseModalities: AUDIO`) e texto (`outputTranscription`);
- Roteia o texto para o painel correto conforme o idioma detectado.

**Entrada digitada**  
Campo “Digite para traduzir…” + **Enviar**: envia a frase como um turno completo, útil em ambiente barulhento ou quando o mic falha.

**Regras de comportamento do “intérprete” (prompt)**  
O modelo deve:

- **Nunca** conversar como assistente (“Claro!”, “Posso ajudar?”).
- Traduzir **só** entre os dois idiomas da sessão.
- Priorizar **sentido e contexto de treino**, não tradução literal.
- Ignorar interjeições vazias (“uhum”, “ok” isolado).
- Esperar **pausa natural** em frases longas antes de traduzir.
- Usar **glossário técnico** (core, ROM, série, rep, agachamento, deadlift, etc.).

**Controles na sessão**

- **Microfone** — ligar/desligar captura (tradutor continua na tela).
- **Áudio** — ligar/desligar a voz da tradução (o **texto** na tela deve continuar funcionando).
- **Layout** — três modos de visualização (ver seção 5).
- **Pausar / Encerrar** — pausa a sessão ou finaliza com resumo (tempo, quantidade de mensagens).

### 4.3 Modo pesquisa (paralelo ao tradutor)

Botão **Pesquisar** ativa um modo em que fala ou texto **não vão para o intérprete**, e sim para **busca na internet** (Gemini + Google Search).

- O usuário pode **falar ou digitar** a pergunta.
- Pode dizer **em qual idioma quer a resposta** (“responde em inglês”) ou escolher a bandeira.
- A resposta aparece numa faixa dedicada; o tradutor ao vivo **não é bloqueado** na tela de fundo.
- **Voltar ao tradutor** desliga o modo pesquisa.

Uso típico: “quantas gramas de proteína por kg?” no meio do treino, sem sair do app.

### 4.4 Cronômetro de descanso

Botão **Cronômetro** inicia contagem regressiva (tempo configurado na setup). Deve aparecer como **badge discreto** (canto da tela), **sem cobrir** os painéis de tradução, para o coach e o aluno **continuarem se comunicando** durante o descanso.

### 4.5 Fim da sessão

Ao encerrar: duração total, número de mensagens traduzidas, opção de copiar histórico e **Nova sessão**.

---

## 5. Modos de visualização (diferencial de UX)

O app não assume que os dois estão do mesmo lado do celular:

| Modo | Descrição | Quando usar |
|------|-----------|-------------|
| **Frente a frente** | Um painel de cabeça para baixo (180°) | Coach e aluno frente a frente, celular no meio |
| **Mesmo lado** | Os dois painéis na mesma orientação, um em cima do outro | Os dois olham do mesmo lado (banco, espelho) |
| **Lado a lado** | Divisão horizontal (EN \| PT) | Celular na horizontal entre os dois |

Isso é central para **treino presencial**, onde Google Translate e apps genéricos só mostram uma lista ou um lado só.

---

## 6. Idiomas suportados

- **Português (BR)**
- **English (US)**
- **English (UK)** — variante no prompt (vocabulário UK quando aplicável)
- **Italiano**

Pares de prompt dedicados: PT↔EN, PT↔IT, EN↔IT, com glossário ajustado.

---

## 7. Arquitetura técnica (visão geral)

```
[Celular]
   ├── Microfone → AudioWorklet (PCM 16 kHz) ──► WebSocket Gemini Live
   ├── Alto-falante ◄── chunks de áudio PCM 24 kHz
   ├── UI React (telas, painéis, controles)
   └── Pesquisa: REST generateContent + Google Search (separado do Live)

[Serviços Google]
   ├── models/gemini-3.1-flash-live-preview  → tradução ao vivo
   └── gemini-2.0-flash                      → pesquisa internet (texto)
```

- **Frontend único**: `index.html` + `config.js` + `mic-worklet.js`.
- **Deploy**: estático (ex.: Vercel); sem backend próprio — a API key vai no `config.js` (com aviso de não expor em URL pública).
- **Limite interno**: ~60 entradas por painel para sessões longas sem travar memória.
- **Reconexão automática** se o WebSocket cair durante a sessão.

---

## 8. Diferencial em relação a outros tradutores

### Google Translate, DeepL, Microsoft Translator (app comum)

- Focados em **texto digitado** ou frase a frase; pouco fluidos para **diálogo contínuo** em academia.
- Não têm prompt de **personal trainer** nem glossário de biomecânica.
- Não oferecem layout **frente a frente / mesmo lado** para duas pessoas com um celular.
- Não combinam **intérprete ao vivo + cronômetro de série + pesquisa rápida** no mesmo fluxo.

### Assistentes de voz (Siri, Google Assistant, ChatGPT voz)

- **Respondem ao usuário**, não apenas repassam tradução entre duas pessoas.
- Não são desenhados para “modo intérprete invisível”.
- Risco de o modelo **conversar** em vez de só traduzir — o Will proíbe isso explicitamente no system prompt.

### Intérpretes humanos / fones tradutores (Timekettle, etc.)

- Hardware extra, custo, pareamento.
- O Will usa **um celular** que o trainer já tem.

### Zoom / Teams com legenda

- Serve reunião online, não treino no chão da academia com barulho e movimento.
- Legendas genéricas erram termos de **carga, série, rep, falha concêntrica**.

### O diferencial resumido do Tradutor Will

1. **Propósito único**: intérprete para **treino físico bilíngue**, não tradutor genérico.
2. **Tempo real verdadeiro**: WebSocket Live, não só “cole e traduza”.
3. **Voz + legenda gigante**: para quem está longe do celular ou suando.
4. **Prompt com glossário de treino** embutido (PT↔EN↔IT).
5. **UX de duas pessoas, um aparelho**: três layouts físicos.
6. **Pesquisa contextual** sem matar a sessão de tradução.
7. **Cronômetro de descanso** integrado, sem overlay que impeça falar.
8. **Simplicidade operacional**: iniciar → falar → encerrar; poucas decisões na hora H.

---

## 9. Fluxo ideal de uma sessão (exemplo)

1. Coach abre o app, escolhe **PT** / **EN (UK)**, voz feminina, descanso **60 s**, inicia.
2. Coloca o celular no chão entre ele e o aluno britânico, modo **frente a frente**.
3. Coach: *“Vamos fazer três séries de agachamento, desce controlado.”*  
   → Aluno ouve e lê em inglês algo como *“Let’s do three sets of squats, go down controlled.”*
4. Aluno: *“My knee hurts a bit.”*  
   → Coach vê em português *“Meu joelho está doendo um pouco.”*
5. Coach toca **Cronômetro**; badge **00:60** no canto; os dois ainda podem falar sobre a dor.
6. Coach ativa **Pesquisar**: *“responde em português: articulação do joelho na agachamento”* → lê a resposta, volta ao tradutor.
7. Sessão segue até **90 min**; encerra e vê quantas trocas foram traduzidas.

---

## 10. Requisitos e limitações honestas

**Requisitos**

- Celular com microfone e navegador moderno.
- Internet estável (Wi‑Fi ou 4G/5G).
- Chave API Google AI Studio válida.
- Permissão de microfone concedida.

**Limitações**

- Qualidade depende do **ruído da academia** e do modelo Gemini.
- API key no cliente: **não é seguro** em site público aberto (documentado no `config.js`).
- Testes de voz reais dependem do dispositivo; áudio desligado deve manter **texto** (requisito de produto).
- Não substitui profissional de saúde em caso de lesão; só comunica o que foi dito.

---

## 11. Visão de produto (north star)

O Tradutor Will deve ser percebido como: **“o colete invisível de tradução do personal”** — sempre ligado na sessão, discreto, rápido, com linguagem de treino certa, sem virar mais um app de IA que “conversa”.

Sucesso = coach e aluno **terminam o treino entendendo séries, técnica, dor e motivação**, sem sentir que passaram a sessão lutando contra um tradutor genérico.
