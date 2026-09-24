# TapFinance — especificação de paridade funcional com Cashew

## Objetivo

Reimplementar, com identidade própria e arquitetura Expo/React Native, os fluxos públicos do Cashew. Não reutilizar marca, textos, ícones autorais ou código Flutter do produto de referência.

## Princípios

- Android-first, local-first e utilizável sem conta.
- Valores financeiros persistidos como inteiros em unidade mínima.
- Toda transação pertence a uma conta e categoria.
- Transferências são pares atômicos e não entram em receitas/despesas.
- Recursos avançados aparecem progressivamente; registrar um lançamento continua sendo o caminho mais curto.
- UI escura, densa e modular inspirada nas referências, com identidade TapFinance.

## Paridade funcional

### Contas

- Múltiplas contas com nome, tipo, moeda, cor e saldo inicial.
- Conta principal define moeda e defaults.
- Transferências pareadas, correção de saldo, arquivamento e reordenação.

### Transações

- Receita, despesa, transferência e correção.
- Título, notas, data/hora, conta, categoria, subcategoria e tags.
- Busca, filtro, agrupamento mensal e seleção múltipla.
- Próxima, recorrente, assinatura, empréstimo e status pago/pendente.
- Duplicação, histórico de atividade, importação/exportação CSV e deep link.

### Orçamentos e análises

- Orçamento recorrente ou período customizado.
- Inclusão automática por conta/categoria/tipo ou inclusão manual.
- Limites por categoria, progresso temporal, histórico por ciclo e gasto diário recomendado.
- Resumo por categoria, barras e gráfico de composição.

### Metas e empréstimos

- Metas de entrada ou saída com contribuições ligadas a transações.
- Empréstimos emprestado/tomado, pagamentos parciais e compensação manual.

### Automação

- Agendamentos e assinaturas com próxima ocorrência.
- Sugestões por notificações bancárias existentes no projeto.
- Lançamento rápido pelo Assistente Android existente.

### Personalização e dados

- Tema claro/escuro/sistema, cor de destaque e moeda principal.
- Gerenciamento de contas, categorias, títulos, budgets e dados arquivados.
- Backup/restauração local e exportação/importação CSV.
- Sem anúncios; nenhuma coleta de dados.

## Navegação

1. **Início** — contas, orçamento principal, resumo de receita/despesa, metas e recentes.
2. **Transações** — meses, busca, filtros e lista agrupada.
3. **Orçamentos** — cards, ciclo atual, composição e histórico.
4. **Mais** — relatórios, calendário, assinaturas, agendados, metas, empréstimos e cadastros.

O botão flutuante cria transação; pressão longa abre transferência, correção e atalhos.

## Motion

- Press feedback: 100–140 ms.
- Entrada de módulos: 180–240 ms, stagger máximo de 45 ms.
- Drawers e modais: 220–280 ms, saída menor que entrada.
- Gráficos e progresso: interpolação apenas após carregamento ou mudança de período.
- Redução de movimento elimina deslocamento e preserva fades curtos.

## Critérios de aceite

- Todas as quatro áreas navegam e persistem dados reais em SQLite.
- Fluxos CRUD completos para contas, categorias, transações, orçamentos, metas, empréstimos e agendamentos.
- Transferências preservam saldo e não contaminam totais.
- Filtros e relatórios batem com dados persistidos.
- `npm run typecheck`, `npm test` e export Android passam.
- QA visual cobre as oito referências em viewport móvel.
