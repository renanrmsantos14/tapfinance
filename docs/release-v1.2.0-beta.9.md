# TapFinance 1.2.0-beta.9

Pré-release Android, versionCode 23. Banco permanece no esquema 6. Substitui a beta.8 (mesmo visual Bento azul) com as correções da revisão do PR #8.

## Alterações desde a beta.8

- Orçamentos e Início: o bloco de resumo deixa de somar o gasto de orçamentos que se sobrepõem (geral + por categoria, ciclos diferentes). Passa a destacar o orçamento mais próximo do limite, com contagem de orçamentos e de estourados.
- Extrato aberto a partir de Categorias ou do detalhe de um orçamento mostra exatamente o que o bloco somou: período exato, lançamentos pagos, lançamentos padrão e despesas. O período aparece em destaque com botão para voltar ao mês inteiro.
- Novo lançamento: quando a meta ou empréstimo vindo da URL não existe mais, volta a existir a ação "Continuar sem vínculo".
- Extrato: saldo do dia calculado por moeda. O app continua usado só em BRL; isso apenas evita uma soma errada caso exista outra moeda cadastrada.

## Alterações da beta.8 (mantidas)

- Visual "Bento azul": blocos arredondados com borda leve, bloco escuro para o saldo, acento azul e tipografia Manrope em todo o app, nos temas claro e escuro.
- Início em blocos, nova aba Categorias, extrato com chips e grupos por dia, orçamentos com anel e detalhe com ritmo diário, formulário de lançamento refeito com grade de categorias e Salvar fixo.

## Cuidados e limites

- Faça backup completo antes de atualizar. Não faça downgrade nem restaure backup do esquema 6 em versão anterior.
- Telas de Mais, Ajustes, Calendário, Relatórios, cadastros e edição de lançamento receberam apenas a fonte e os componentes novos.
- Sem aparelho ou emulador conectado: aparência, toque, teclado, TalkBack, notificações e instalação real não foram válidados.
- APK de avaliação mantém a chave debug das betas anteriores; não é assinatura de produção para Play Store.

## Verificação

- TypeScript e 173 testes passaram, sem falhas.
- Gradle assembleRelease concluído em 4m40s; pacote `com.tapfinance.app`, versão `1.2.0-beta.9`, código 23 e quatro ABIs: arm64-v8a, armeabi-v7a, x86 e x86_64.
- Assinatura v2 válida; certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, o mesmo das betas anteriores.
- APK: 111.255.823 bytes; SHA-256 `d89dffde1d01be28340f04897ce3be9eae6268d06d5f9530ac5b321f46e273b0`.
- Bundle dentro do APK e bundle gerado têm o mesmo SHA-256 `10b5a689f9e060d5c2487a502efee0b786e6a3d5ddcbc9be8dd567712e30d6fa`; inspeção confirmou os textos novos do resumo de orçamentos. Isso não substitui teste visual no aparelho.
