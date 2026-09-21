# TapFinance — arquitetura

## Runtime

- Expo SDK 57 + React Native 0.86 + Expo Router.
- `SQLiteProvider` inicializa `tapfinance.db` em WAL e semeia categorias estáveis.
- Repositórios recebem `SQLiteDatabase` e usam bind parameters; valores são INTEGER em centavos.
- `quick-entry` é rota dedicada e recebe `assistant=1` para fechar a pilha após salvar quando invocada pelo Android.

## Native Assistant

- `modules/tapfinance-assistant` é autolinked via `expo-module.config.json` e `expo.autolinking.searchPaths`.
- Kotlin expõe RoleManager por Expo Modules API.
- Manifest do módulo declara `VoiceInteractionService`, `VoiceInteractionSessionService`, metadata `android.voice_interaction` e XML `voice-interaction-service`.
- A sessão desabilita UI própria e chama `startAssistantActivity` para `tapfinance://quick-entry?assistant=1`.
- Nenhum sensor, microfone, captura de tela ou API privada Xiaomi é usado.

## UI

- Tokens em `src/theme`; tema acompanha sistema.
- UI nativa React Native com NativeWind configurado no Metro/Babel e ícones Lucide React Native.
- Motion deliberadamente curto/sem transições longas no fluxo de entrada rápida; controles têm alvo mínimo confortável.

## CNG

- `app.json` é fonte de configuração e `npx expo prebuild --clean` regenera `android/` e `ios/`.
- Serviços Android ficam no módulo local; não dependem de edição manual persistente no manifest gerado.
