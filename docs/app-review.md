# Revisão integral do TapFinance

## Escopo e critério de conclusão

Revisar funcionalidade, consistência financeira, persistência, navegação, acessibilidade e UI de todas as rotas. O objetivo continua aberto até verificar cada fluxo no runtime e corrigir as diferenças encontradas. Testes unitários ou exportação do bundle não comprovam a experiência em dispositivo.

Referências: `docs/cashew-parity-spec.md`, `implementation_plan.md`, código atual e referências visuais enviadas. A consulta GSD em 30/09/2026 confirmou ausência de `.planning` e de fases; revisão executada diretamente, sem alegar execução de uma fase GSD.

## Correções verificadas em 30/09/2026

| Problema reproduzido | Correção | Evidência |
| --- | --- | --- |
| Mensal do dia 31 permanece no dia 28 depois de fevereiro | Preservar o dia original pela primeira instância registrada | SQLite real em memória: janeiro 31, fevereiro 28, março 31, abril 30 |
| Anual de 29/02 perde o dia no próximo ano bissexto | Preservar mês e dia originais | Ocorrências de 2024 até 2028 |
| Atualizações simultâneas disputam transações e podem duplicar ocorrências | Serializar geração por conexão e usar transação exclusiva com releitura do agendamento | Duas chamadas concorrentes, contagem e próxima data verificadas |
| Receita pode usar categoria de despesa; valores inválidos podem ser persistidos | Validar centavos, data, conta ativa e categoria compatível antes de inserir | Rejeição com zero registros persistidos |
| Recorrência só aparece em transações após visitar Início | Gerar também ao carregar Transações e Calendário | Integração no código; runtime ainda pendente |

O esquema continua na versão 3. A âncora usa `MIN(schedule_instances.scheduled_for)` e permanece disponível mesmo que a transação da primeira ocorrência seja excluída. A correção não altera transações já geradas com datas antigas; histórico financeiro existente é preservado.

## Formulário de cadastros

| Antes | Depois | Motivo |
| --- | --- | --- |
| Recorrência sempre começa agora e usa conta automática | Data editável e seletor de contas existente | Usuário controla data e origem do lançamento |
| Trocar tipo mantém categoria incompatível | Categoria válida do novo tipo é selecionada | Prevenir receita classificada como despesa |
| Valor sem máscara e salvamento inválido sem resposta | Campo monetário compartilhado e erro acessível no formulário | Mostrar valor efetivo e explicar a correção necessária |
| Toques repetidos podem criar cadastros repetidos | Guarda síncrona, botão desabilitado e estado “Salvando…” | Evitar duplicação durante a persistência |
| Teclado pode cobrir controles do modal | KeyboardAvoidingView e rolagem existentes | Manter campos e ação alcançáveis |

Motion permanece curto e respeita redução de movimento. Teclado, foco, máscara, retorno Android e aparência precisam de QA em dispositivo; `adb devices` e `emulator -list-avds` não apresentaram alvos em 30/09/2026.

## Cobertura restante — não concluída

### Metas e empréstimos — segundo lote de 30/09/2026

- Criação valida nome, centavos inteiros positivos e prazo válido; empréstimos exigem conta ativa.
- Conta padrão do empréstimo é a principal atual, em vez de um ID fixo.
- Empréstimo e desembolso são persistidos em uma transação exclusiva; falha no desembolso não deixa cadastro parcial.
- Progresso considera somente lançamentos comuns pagos: transferências e correções ficam excluídas.
- Pagamentos parciais, edição e exclusão de pagamentos, contribuições pendentes e contribuições de tipo diferente foram verificados com SQLite real em memória.
- Formulário permite prazo opcional. Detalhes mostram prazo e oferecem recuperação de erro de carregamento, sem manter “Carregando…” indefinidamente.
- Pendente: testar essas interações em dispositivo, implementar edição dos cadastros/compensação e revisar os efeitos de editar ou excluir o desembolso inicial.

### Orçamentos — terceiro lote de 30/09/2026

- Criação e edição compartilham validação de datas, valores e categorias; persistência exclusiva evita configurações parciais.
- Quatro testes com SQLite real verificam períodos, limites, filtros, totais e rollback de edição.
- Formulários usam máscara monetária, proteção contra duplo salvamento, ajuste ao teclado e erros acessíveis. Lista e detalhes oferecem recuperação de falha sem exibir o ciclo anterior.
- Interações e aparência em dispositivo continuam pendentes.

### Demais áreas

- Início: conferir saldos, carregamento, erros, módulos e consistência com as demais telas.
- Transações: cadastro/edição/exclusão, status, filtros, seleção múltipla, tags, duplicação e vínculos com metas/empréstimos.
- Contas e categorias: arquivamento/restauração, correção de saldo, hierarquia e efeito sobre automações existentes.
- Recorrências: edição, pausa/retomada, próximas ocorrências e efeito sobre lançamentos pendentes já gerados; revisar captura de atrasos acima do limite de 12 por atualização.
- Metas e empréstimos: validar criação, pagamentos parciais, edição de principal, compensação e consistência após exclusão de movimentos.
- Orçamentos e análises: comparar filtros e ciclos com dados persistidos e testar todos os estados da UI.
- Calendário: interação por dia, indicação de pendente/pago e navegação entre períodos.
- Dados: testar CSV, backup/restauração e recuperação nativos com dados representativos.
- Assistente e notificações: verificar os fluxos completos no Android e as permissões.
- Preferências: implementar/verificar personalização prevista na especificação.
- UI completa: revisar todas as rotas em tema claro/escuro, texto ampliado, teclado, leitor de tela e referências visuais.

## Gates deste lote

- 45 testes passaram: oito de agendamento, sete de metas/empréstimos e quatro de orçamentos, além da cobertura anterior.
- TypeScript e `git diff --check` passaram após as alterações finais de código.
- Export Android passou após as alterações finais de código (3.316 módulos; bundle Hermes gerado).
- APK universal beta.2 compilado com sucesso; versão Android 16. O limite de caminhos do Ninja foi contornado com mapeamento temporário da pasta pai em T: e ajuste local CMake, descritos nas notas da release.
- Lote preparado para a pré-release 1.2.0-beta.2; publicação remota deve ser conferida separadamente.
