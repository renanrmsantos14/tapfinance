# TapFinance 1.2.0-beta.8

Pré-release Android, versionCode 22. Banco permanece no esquema 6.

## Alterações

- Novo visual "Bento azul": blocos arredondados com borda leve em vez de sombra, bloco escuro para o saldo, acento azul e tipografia Manrope (400–800) em todo o app, nos temas claro e escuro.
- Início reorganizado em blocos: saldo com contas, receitas e despesas, gastos por categoria, orçamento em anel, orçamento estourado ou próximo vencimento, metas e empréstimos, recentes.
- Nova aba Categorias: distribuição das despesas pagas do mês, maior gasto e blocos por categoria que abrem o extrato já filtrado. A barra inferior passa a ter cinco abas (Início, Extrato, Categorias, Orçamentos, Mais).
- Extrato com busca, chips rápidos de tipo e categoria, filtros avançados em bloco, totais de entradas e saídas e grupos por dia com saldo do dia. Aceita filtro de categoria e mês vindo de outras telas.
- Orçamentos com anel do total e disponível por dia; detalhe mostra progresso com marca do limite, ritmo diário e blocos por categoria.
- Novo lançamento refeito: tipo no topo, valor em destaque com a moeda da conta, contas com saldo, grade de categorias com lista completa em folha, situação em dois botões, data/hora e "Mais detalhes" recolhíveis e botão Salvar fixo mostrando o valor.
- Mantidos cálculos, validações, confirmações financeiras, histórico, backup, dados e seletor de versões. Sem migração de banco.

## Cuidados e limites

- Faça backup completo antes de atualizar. Não faça downgrade nem restaure backup do esquema 6 em versão anterior.
- Telas de Mais, Ajustes, Calendário, Relatórios, cadastros e edição de lançamento receberam apenas a fonte e os componentes novos; o layout delas continua o da beta.7.
- Sem aparelho ou emulador conectado: aparência, toque, teclado, TalkBack, notificações e instalação real não foram validados. Conferir no aparelho a fonte nos campos de texto, a grade de categorias em telas estreitas e a barra inferior com o gesto de voltar.
- A instalação de dependências removeu do lockfile pacotes que não eram dependências declaradas (react-dom, react-native-gesture-handler, prettier). Nada no código os importa; o modo web precisa de react-dom se for usado.
- APK de avaliação mantém a chave debug das betas anteriores; não é assinatura de produção para Play Store.

## Verificação

- TypeScript e 172 testes passaram, sem falhas.
- Gradle assembleRelease concluído em 14m08s. Bundle de 3.354 módulos e 36 assets (inclui as cinco variantes da Manrope); pacote `com.tapfinance.app`, versão `1.2.0-beta.8`, código 22 e quatro ABIs: arm64-v8a, armeabi-v7a, x86 e x86_64.
- Assinatura v2 válida; certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, o mesmo das betas anteriores.
- APK: 111.253.543 bytes; SHA-256 `dab6051511b35481b8819093c907b47e3040fc8c869f07af5b94a7194441b902`.
- Bundle dentro do APK e bundle gerado têm o mesmo SHA-256 `60326c6536116a1f651a97994e9d4c8f488798edaccc9a0ab0f5313814eb353f`. Isso não substitui teste visual no aparelho.
