# TapFinance 1.2.0-beta.7

Pré-release Android, versionCode 21. Banco permanece no esquema 6.

## Alterações

- Visual mais clean nos temas claro/escuro, Início, Mais, Ajustes, histórico, formulários, orçamentos, metas e empréstimos. Menos bordas decorativas, tipografia mais leve e nomes/valores com mais espaço.
- Cabeçalhos compartilhados, ações com alvo de 48 dp nas superfícies revisadas e estados desabilitados durante gravação. Modais e feedback respeitam reduzir movimentos; dados não aguardam animação decorativa para aparecer.
- Histórico inclui contas e categorias arquivadas nos filtros, com proteção contra respostas tardias. Relatórios identificam mês e ano.
- Cadastros recebem cabeçalho consistente, lista simplificada, reordenação/opções maiores e filtros que não exibem contagem antiga durante carregamento ou erro.
- Mantidos cálculos, confirmações financeiras, histórico, dados e seletor de versões estáveis/beta. Sem expansão de USD ou nova migração.

## Cuidados e limites

- Faça backup completo antes de atualizar. Não faça downgrade nem restaure backup do esquema 6 em versão anterior.
- Esta beta inclui os lotes CLEAN; a beta.6 publicada não os contém.
- A revisão integral de UI/UX não está concluída: editores de cadastro e telas restantes ainda precisam de acabamento e inspeção nativa.
- Sem aparelho/emulador conectado: aparência, toque, teclado, TalkBack, notificações e instalação real não foram validados.
- APK de avaliação mantém a chave debug das betas anteriores; não é assinatura de produção para Play Store.

## Verificação

- TypeScript e 172 testes passaram, sem falhas; diff sem erro de whitespace.
- Gradle assembleRelease concluído em 8m23s. Bundle de 3.341 módulos; pacote `com.tapfinance.app`, versão `1.2.0-beta.7`, código 21 e quatro ABIs: arm64-v8a, armeabi-v7a, x86 e x86_64.
- Assinatura v2 válida; certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, o mesmo das betas anteriores.
- APK: 112.975.761 bytes; SHA-256 `bd9d95815a0761ed15a4f480fcc117b978930387f56b11fc973ade5b6172704f`.
- Bundle dentro do APK e bundle gerado têm o mesmo SHA-256 `0dc4c7ab806aa6d4d11a3ba8dcc17ccf68f53ee503ea2282852ffae54938a0bd`. Inspeção confirmou textos dos cadastros e empréstimos atualizados; isso não substitui teste visual.
