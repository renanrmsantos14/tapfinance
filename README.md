# TapFinance

Aplicativo Android-first e local-first para registrar despesas e receitas em poucos segundos. Os valores são armazenados como inteiros em centavos no SQLite; não há conta, backend, analytics ou sincronização em nuvem.

## Release público

- Repositório: https://github.com/renanrmsantos14/tapfinance
- APK estável: https://github.com/renanrmsantos14/tapfinance/releases/latest/download/app-release.apk
- Pré-lançamento 1.2.0-beta.1: https://github.com/renanrmsantos14/tapfinance/releases/tag/v1.2.0-beta.1

O APK de teste é assinado com a chave debug padrão do projeto. Para publicação na Play Store, configure uma keystore de produção.

## Pré-requisitos

- Node.js 22 LTS ou compatível com Expo SDK 57.
- Android Studio, Android SDK, JDK 17 e um dispositivo/emulador Android para gerar APK local.
- Para testar o Back Tap: POCO/Xiaomi com HyperOS e Development Build instalado.

## Instalação e desenvolvimento

```bash
npm install
npx expo start --dev-client
```

O Expo Go não cobre o módulo nativo do Digital Assistant. Use Development Build:

```bash
npx expo prebuild
npx expo run:android
```

## Testes e validação

```bash
npm run typecheck
npm test
npx expo export --platform android
```

O export valida o bundle JavaScript. O APK exige JDK, Android SDK e Gradle disponíveis:

```bash
npx expo prebuild --clean
npx expo run:android --variant debug
cd android
./gradlew assembleRelease
```

APK debug costuma ficar em `android/app/build/outputs/apk/debug/app-debug.apk`; release em `android/app/build/outputs/apk/release/app-release.apk`. Confirme o caminho após o Gradle terminar.

Instalação via ADB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Digital Assistant e Back Tap

O Android oficial é usado através de `RoleManager.ROLE_ASSISTANT`, `VoiceInteractionService`, `VoiceInteractionSessionService` e `VoiceInteractionSession`. A sessão não usa microfone, não captura tela e não reconhece voz; ela abre `tapfinance://quick-entry?assistant=1` com `startAssistantActivity()`.

No Android, toque em Ajustes → Assistentes e entrada de voz → Aplicativo assistente digital (o nome varia por versão) e selecione TapFinance. Dentro do app, use **Ajustes → Ativar lançamento por Back Tap** para abrir a solicitação oficial do papel.

No POCO/HyperOS, o fluxo esperado é:

1. Configurações.
2. Configurações adicionais.
3. Atalhos de gestos.
4. Back tap.
5. Double back tap.
6. Launch digital assistant.

Os rótulos podem mudar conforme idioma e versão do HyperOS. O app não tenta detectar o gesto por acelerômetro, não usa APIs privadas Xiaomi e não afirma que o caminho visual foi validado sem o aparelho.

### Teste manual sem computador

1. Instale o novo APK e confirme que TapFinance continua selecionado como assistente digital padrão.
2. Abra **Ajustes → Iniciar teste do Back Tap**.
3. Aperte Home e faça o Back Tap uma vez. Se nada abrir, não repita o gesto antes de coletar o diagnóstico.
4. Reabra TapFinance pelo ícone, vá a **Ajustes → Compartilhar diagnóstico** e envie o texto gerado.

O relatório contém versão do APK, modelo/Android, estado do papel de assistente e até 30 eventos recentes com horário UTC. Não inclui lançamentos financeiros. Se aparecer apenas `manual test started`, o gesto não chegou aos componentes do TapFinance; a causa exata exige verificar a configuração ou o comportamento do HyperOS. Se aparecer `voice session shown` mas não `quick-entry route opened`, a falha ocorreu na abertura da tela.

## Funcionalidades

- Resumo mensal de saldo, receitas, despesas e lançamentos recentes.
- Quick Entry com teclado numérico, entrada brasileira e categoria imediata.
- Histórico com filtros, edição e confirmação antes de excluir.
- SQLite com migrations iniciais e seed estável de categorias.
- Exportação CSV pelo compartilhamento do Android.
- Light/dark automático, labels acessíveis e feedback háptico curto.

## Estrutura

- `app/`: rotas Expo Router.
- `src/database/`: inicialização, schema e IDs.
- `src/repositories/`: queries parametrizadas.
- `src/components/`: entrada monetária, categorias, itens e navegação.
- `src/services/`: Assistant e exportação.
- `modules/tapfinance-assistant/`: módulo Kotlin local e serviços Voice Interaction.

## Privacidade

O banco permanece no dispositivo. O app não pede contatos, localização, câmera, microfone, SMS, chamadas ou galeria. O arquivo CSV só é compartilhado quando o usuário solicita a exportação.

## Troubleshooting

- Se o status do Assistant aparecer como indisponível, abra o build nativo instalado; Expo Go não registra os serviços Kotlin.
- Se `npx expo prebuild --clean` falhar, confira Node, JDK 17, Android SDK e `ANDROID_HOME`/`ANDROID_SDK_ROOT`.
- Se o POCO não listar TapFinance, reinstale o Development Build e confirme que o módulo aparece no manifest mesclado.
- Se o gesto abrir o app sem Quick Entry, confira o deep link `tapfinance://quick-entry?assistant=1` e o modo `singleTask`.
