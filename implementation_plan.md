# TapFinance — plano de implementação Cashew-parity

## Fase 1 — Fundação financeira

- [x] Migrar SQLite para contas, categorias hierárquicas e transações ricas.
- [x] Implementar transferências atômicas, correções e saldos.
- [x] Preservar lançamentos existentes por migração incremental.
- [x] Cobrir cálculos principais e migração SQLite com testes locais; restauração nativa ainda requer dispositivo.

## Fase 2 — Shell e linguagem visual

- [x] Criar shell de quatro áreas e entrada rápida contextual.
- [x] Aplicar tokens escuros, superfícies azuladas, tipografia e estados de pressão.
- [x] Criar carrossel de contas, cards de resumo e primitives de progresso.
- [x] Respeitar redução de movimento nos componentes de pressão, entrada e modais principais.

## Fase 3 — Fluxos principais

- [ ] Home completa com contas, orçamento, resumos, metas e recentes.
- [ ] Transações com mês, busca, filtros, agrupamento e detalhes.
- [ ] Composer de transação com conta, categoria, recorrência e metadados.
- [x] Contas/categorias com edição, arquivamento e reordenação.

## Fase 4 — Planejamento

- [x] Orçamentos semanais/mensais/customizados com edição, seleção e limites por categoria.
- [x] Histórico por ciclo, gasto diário recomendado e composição (cálculo testado; QA visual pendente).
- [x] Metas de receita/despesa com progresso ligado a lançamentos.
- [x] Empréstimos tomados/emprestados com saldo recalculado pelos movimentos.

## Fase 5 — Automação e dados

- [x] Agendamentos, assinaturas, próximas transações e calendário mensal.
- [x] Importação CSV, backup/restauração e atividade (implementados; QA em dispositivo pendente).
- [ ] Integrar notificações bancárias e Assistente Android aos novos modelos.
- [ ] Preferências de tema, destaque, moeda e home configurável.

## Fase 6 — Verificação

- [x] Typecheck.
- [x] Testes automatizados (26 passaram em 24/09/2026; backup nativo ainda requer dispositivo).
- [x] Export Android (bundle gerado em 24/09/2026; prebuild e teste em dispositivo pendentes).
- [ ] QA visual das quatro áreas e fluxos CRUD.
- [ ] Revisão de diff, acessibilidade, motion e documentação.
