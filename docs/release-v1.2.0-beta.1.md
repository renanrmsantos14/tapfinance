# TapFinance 1.2.0-beta.1

Pré-lançamento da nova experiência financeira inspirada no Cashew, com identidade e código próprios.

## O que mudou

- Navegação em quatro áreas, resumo de contas, receitas, despesas, metas, empréstimos e próximos lançamentos.
- Contas e categorias editáveis, organizáveis e arquiváveis; transferências pareadas entre contas.
- Transações com busca, filtros por conta/categoria/situação/natureza, agrupamento diário e detalhes.
- Orçamentos semanais, mensais e personalizados com histórico por ciclo, limites por categoria, composição e valor diário disponível.
- Metas, empréstimos, agendamentos, assinaturas, calendário, análises e atividade.
- Importação e exportação CSV; backup e restauração completos com cópia local de recuperação.
- Correção de integridade: excluir uma transferência remove as duas movimentações; editar somente um lado é bloqueado.

## Validação e limites

- TypeScript e testes automatizados passaram; compilação Android é parte do gate desta versão.
- Não houve teste visual ou de backup/restauração em dispositivo: nenhum dispositivo/emulador estava conectado no ambiente de build.
- APK de teste assinado pela chave debug do projeto. Não é pacote para Play Store.
- A paridade funcional e visual total com o Cashew ainda não foi concluída. Permanecem, entre outros pontos, personalização completa, edição avançada de recorrências, seleção múltipla e integração dos novos modelos com notificações/Assistente Android.
- Auditoria npm: nenhuma vulnerabilidade alta no limiar usado; 14 moderadas transitivas. Não aplicamos `npm audit fix --force` por exigir mudanças incompatíveis com Expo SDK 57.

Instale esta versão apenas para avaliação e mantenha um backup dos dados antes de testar a restauração.
