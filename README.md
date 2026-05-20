# Tradutor Will — Modo Solo

Intérprete invisível PT ↔ EN em tempo real para sessões de personal trainer.
Usa a **Gemini Live API** (áudio bidirecional end-to-end) para traduzir conversas com contexto, sem perder frases longas e sem timeout do microfone.

## Como funciona

1. Coloque o iPhone num suporte, próximo aos dois falantes.
2. Toque **Iniciar Sessão**.
3. Você fala em português → o app fala a tradução em inglês pelo alto-falante.
4. O aluno fala em inglês → o app fala a tradução em português.
5. O microfone fica aberto a sessão inteira — sem precisar tocar em nada.

O glossário técnico de treinamento funcional e biomecânica está embutido no arquivo `index.html`, nas constantes `PROMPT_PT_EN`, `PROMPT_PT_IT` e `PROMPT_EN_IT`.

## Como obter a API key (uma vez só)

1. Vá em **https://aistudio.google.com/apikey**
2. Faça login com sua conta Google.
3. Clique em **Create API key**.
4. Copie a chave (começa com `AIza...`).
5. Cole na tela inicial do app na primeira vez. Fica salva no celular.

Mantenha essa chave privada — qualquer um com acesso a ela pode consumir seus créditos.

## Como rodar (hospedar grátis)

O Safari do iPhone só dá acesso ao microfone em sites com **HTTPS**. Por isso o app precisa estar hospedado. Três opções gratuitas, todas em 2 minutos:

### Opção 1 — Vercel (mais simples)

1. Crie conta em **https://vercel.com** (login com GitHub ou Google).
2. Clique em **Add New → Project**.
3. Arraste a pasta `TRADUTOR WILL` inteira para o navegador.
4. Em segundos, você recebe uma URL tipo `https://tradutor-will.vercel.app`.
5. Abra essa URL no Safari do iPhone.

### Opção 2 — Netlify Drop

1. Vá em **https://app.netlify.com/drop**.
2. Arraste a pasta `TRADUTOR WILL` para a área indicada.
3. Recebe uma URL HTTPS pronta.

### Opção 3 — Cloudflare Pages

1. Crie conta em **https://pages.cloudflare.com**.
2. Faça upload direto pela interface ou conecte um GitHub.

## Como instalar como app no iPhone

Depois que estiver hospedado:

1. Abra a URL no **Safari** (precisa ser Safari, não Chrome).
2. Toque no ícone de **Compartilhar** (quadrado com seta pra cima).
3. Role e toque em **Adicionar à Tela de Início**.
4. Pronto — vira um app na home, abre tela cheia, sem barra de navegação.

## Permissões necessárias

Na primeira vez que tocar em "Iniciar Sessão", o iPhone vai pedir:

- **Microfone** — obrigatório.
- (Wake Lock é automático, mantém a tela acesa enquanto a sessão está ativa.)

## Limitações da v1 (Modo Solo)

- **Precisa de internet** — sem conexão, a API não funciona.
- **Tela acesa durante a sessão** — para Modo Solo isso é OK (celular no suporte). O **Modo Pareado** (com fone, celular no bolso) será adicionado na próxima versão.
- **Sessões muito longas (>1h)** — a Live API pode encerrar conexões longas. O app renova a conexão de forma preventiva durante a sessão e reaplica o contexto recente ao prompt para continuar traduzindo com sentido.
- **Ícones** — placeholders. Você pode substituir `icon-192.png` e `icon-512.png` por imagens próprias.

## Estimativa de custo

Pela tabela atual da Gemini Live API (Google AI Studio):

- ~US$ 0,50 a US$ 2,00 por sessão de 1 hora (depende de quanto vocês falam).
- Crédito gratuito mensal do AI Studio costuma cobrir várias sessões por mês.

## Solução de problemas

**"Erro ao iniciar"** — verifique se a API key está correta e ativa. Teste em [https://aistudio.google.com](https://aistudio.google.com).

**Microfone não capta voz** — abra o app por uma URL **HTTPS** no Safari/Chrome e permita o microfone. Em iPhone, o navegador pode capturar em 44.1/48 kHz mesmo quando o app pede 16 kHz; o app envia o sample rate real para a Gemini e mantém um fallback de captura caso o AudioWorklet falhe.

**Sessão de 1 hora** — a Live API pode encerrar conexões por volta de 10–15 minutos. O app renova a conexão preventivamente a cada ~8,5 minutos, reaplica o contexto recente e tenta modelos fallback se o modelo principal estiver indisponível.

**Áudio cortado / lento** — provavelmente Wi-Fi ruim ou rede móvel fraca. Tente trocar de rede.

**Aluno não ouviu uma frase curta** — interjeições muito curtas ("hm", "ok") são propositalmente ignoradas. Fale a frase completa.

**Tradução errada de um termo técnico** — edite o glossário em `index.html`, na constante do par de idiomas usado. Faça novo upload pra Vercel/Netlify (arrastar de novo substitui).

## Roadmap

- [ ] **Modo Pareado** — 2 celulares conectados, cada um com fone, áudio só no destinatário (academia, ambiente ruidoso, celular no bolso)
- [ ] **Voz configurável** — escolher entre vozes masculinas/femininas
- [ ] **Histórico de sessões** — salvar transcrição para revisar depois
- [ ] **Glossário personalizado pela UI** — adicionar termos sem editar código
- [ ] **Modo italiano** — para os seus estudos
