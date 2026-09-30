# TapFinance 1.2.0-beta.3

Pré-release de gerenciamento de recorrências e integridade de empréstimos. Android versionCode 17.

## Alterações

- Recorrências podem ser editadas, pausadas, retomadas e excluídas. Regras inativas continuam acessíveis. Excluir uma regra preserva seus lançamentos.
- Atualização opcional de pendentes futuros é atômica e preserva pagos, vencidos, datas, notas e tags. A data da regra representa a próxima ocorrência a gerar.
- Metas e empréstimos oferecem edição e recuperação de arquivados. Empréstimos permitem compensar o saldo explicitamente, sem inventar pagamentos ou movimentações de conta.
- Empréstimos novos identificam o desembolso inicial. Excluí-lo não apaga a dívida; editar seu valor ajusta a referência pela diferença, atomicamente.
- Empréstimos legados mantêm o cálculo anterior até identificação manual do desembolso. O aplicativo não infere vínculos por nome, data ou valor; identificar preserva o saldo atual e o histórico.
- Edição de lançamentos preserva campos opcionais omitidos, status e horário original ao alterar apenas a data. Confirmações explicam os efeitos financeiros e impedem salvamento duplicado.
- Atividade mostra ajustes com valores anterior/novo. Máscara monetária não transforma entrada excessiva em zero.
- Banco migra para esquema 5. Backups v3/v4/v5 são inspecionados; restauração migra o banco importado antes de alterar o ativo. Versões futuras são rejeitadas.

## Validação e limites

- 72 testes automatizados passaram, sem falhas; TypeScript e exportação Android aprovados (3.318 módulos, bundle Hermes).
- Faça backup antes de atualizar. Backups novos no esquema 5 não são compatíveis com aplicativos antigos; não faça downgrade sobre o banco migrado.
- APK de avaliação usa a chave debug existente, não uma chave de produção para Play Store.
- Sem dispositivo/emulador disponível: aparência, teclado, acessibilidade, restauração real, Assistente e notificações ainda precisam de QA nativo.
- Revisão integral e paridade completa com o Cashew permanecem abertas. Esta versão não é declarada estável nem uma cópia integral concluída.

## Build Windows

Reutiliza o caminho curto `T:\tapfinance\android` com mapeamento temporário da pasta pai, `--no-daemon` e `CMAKE_OBJECT_PATH_MAX=240`, conforme o procedimento da beta.2. A pasta Android é gerada e não versionada.
