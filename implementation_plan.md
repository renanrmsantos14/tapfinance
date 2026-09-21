# TapFinance — plano de implementação

## Escopo

Construir um app Android-first local-first chamado TapFinance, com lançamento rápido, SQLite em centavos, histórico/edição/exclusão, exportação CSV, configurações e integração Android oficial de Digital Assistant.

## Arquivos e fases

- [NEW] Projeto Expo + TypeScript strict + Expo Router + NativeWind.
- [NEW] `app/` para Home, Quick Entry, Transações, Edição e Settings.
- [NEW] `src/database/`, `src/repositories/`, `src/services/`, `src/utils/`, `src/types/`.
- [NEW] `modules/tapfinance-assistant/` para bridge Expo Modules API/Kotlin.
- [NEW] plugin/config Android reproduzível para manifest, metadata e deep link.
- [NEW] testes unitários de moeda e validação; README operacional.
- [MODIFY] `package.json`, `app.json`/config Expo, `tsconfig.json` e configs NativeWind.

## Regras de implementação

1. Dados locais; sem rede, auth, backend ou permissões desnecessárias.
2. Valores persistidos como INTEGER em centavos; queries com bind parameters.
3. Quick Entry prioriza foco imediato, teclado numérico, categorias locais e feedback curto.
4. RoleManager solicita o papel oficial; nenhum grant silencioso nem API privada Xiaomi.
5. Integração de sessão abre `/quick-entry` sem UI de voz e sem microfone.
6. UI usa tokens semânticos, hierarquia tipográfica, touch targets acessíveis e motion reduzido.
7. Verificação proporcional: typecheck, testes, export/build Expo; Gradle/APK somente se Java/Android SDK estiverem disponíveis.

## Critérios de verificação

- `npm install`
- lint/typecheck/testes
- `npx expo export --platform android` ou equivalente
- `npx expo prebuild --clean` quando o ambiente suportar
- `npx expo run:android`/Gradle e caminho do APK, somente se toolchain existir
- revisão final de diff e documentação dos limites físicos (POCO/HyperOS)
