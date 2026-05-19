// ============================================================
// CONFIGURAÇÃO LOCAL — NÃO COMPARTILHAR ESTE ARQUIVO PUBLICAMENTE
// ============================================================
// Sua API key do Google AI Studio fica embutida aqui pra não precisar
// digitar de novo. Quando o app for hospedado publicamente, qualquer
// pessoa com a URL pode extrair esta chave do código-fonte.
//
// SE FOR DEPLOYAR EM URL PÚBLICA QUE OUTRAS PESSOAS POSSAM ACHAR:
//   1. Apague este arquivo antes do deploy
//   2. Ou regenere a key em https://aistudio.google.com/apikey
//
// Par de idiomas padrão (qual abre selecionado ao iniciar):
//   'pt-en' = Português ↔ Inglês
//   'pt-it' = Português ↔ Italiano
//   'en-it' = Inglês ↔ Italiano
// ============================================================

window.TRADUTOR_CONFIG = {
  DEFAULT_API_KEY: 'AIzaSyDt28vDm1vO30JBniOAhwgKWFtsuArtxI0',
  DEFAULT_LANGUAGE_PAIR: 'pt-en',
  DEFAULT_ENGLISH_VARIANT: 'us',
  // Tradutor ao vivo (WebSocket)
  GEMINI_MODEL: 'models/gemini-3.1-flash-live-preview',
  // Pesquisa na internet (REST generateContent — só texto)
  GEMINI_REST_MODEL: 'gemini-2.0-flash',
};
