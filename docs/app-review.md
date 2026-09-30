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
- Pendente: testar essas interações em dispositivo e revisar os efeitos de editar ou excluir o desembolso inicial. Edição e compensação foram implementadas na continuação local abaixo.

### Orçamentos — terceiro lote de 30/09/2026

- Criação e edição compartilham validação de datas, valores e categorias; persistência exclusiva evita configurações parciais.
- Quatro testes com SQLite real verificam períodos, limites, filtros, totais e rollback de edição.
- Formulários usam máscara monetária, proteção contra duplo salvamento, ajuste ao teclado e erros acessíveis. Lista e detalhes oferecem recuperação de falha sem exibir o ciclo anterior.
- Interações e aparência em dispositivo continuam pendentes.

### Demais áreas

- Início: conferir saldos, carregamento, erros, módulos e consistência com as demais telas.
- Transações: cadastro/edição/exclusão, status, filtros, seleção múltipla, tags, duplicação e vínculos com metas/empréstimos.
- Contas e categorias: arquivamento/restauração, correção de saldo, hierarquia e efeito sobre automações existentes.
- Recorrências: QA nativo da edição, pausa/retomada e ações; revisar captura de atrasos acima do limite de 12 por atualização e distinguir próximas transações já geradas do cursor de novas ocorrências.
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

## Continuação após a beta.2 — gerenciamento de recorrências (local)

Não faz parte do APK beta.2 já publicado. A revisão integral permanece aberta.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Tocar na recorrência só arquiva e ela desaparece | Toque abre edição; menu oferece pausa/retomada e exclusão da regra; inativas continuam na lista | Tornar gerenciamento e recuperação alcançáveis |
| Efeito de arquivar sobre futuras ocorrências não é claro | Confirmação nomeia regra/valor e explica que lançamentos existentes permanecem | Tornar consequências visíveis antes da ação |
| Não há escolha sobre ocorrências pendentes existentes | Opção desmarcada permite atualizar título, tipo, valor, conta e categoria somente de pendentes futuros | Preservar histórico pago e evitar mudanças financeiras implícitas |
| Erros de cadastro podem parecer lista vazia | Estado de carregamento, erro e ação de tentar novamente | Evitar falso vazio e permitir recuperação |

- Atualização é exclusiva e atômica; falha ao atualizar pendentes reverte também a configuração.
- Datas existentes, notas, tags, pagos e pendentes vencidos são preservados. A data editada é a próxima **a gerar**, não move ocorrências existentes; a tela explica a diferença.
- Uma regra inativa não é reativada ao editar. Retomada valida referências ativas e exige nova data para uma ocorrência única já gerada.
- Excluir a regra mantém todas as transações e apenas remove seu vínculo; confirmação explícita na UI.
- Esquema 4 armazena âncora de recorrência editável. Migração da versão 3 usa a primeira instância, inclusive quando sua transação foi excluída. Testes verificam preservação de valores, status e idempotência.
- Inspeção aceita backups completos v3/v4 e rejeita versões futuras/estrutura incompleta. Restauração migra o banco importado isoladamente antes de copiar para o banco ativo; compartilhamento, cópia e recuperação precisam de prova nativa.
- 55 testes, TypeScript e `git diff --check` passaram. Export Android passou após o último ajuste (3.317 módulos; bundle Hermes gerado).
- Sem alvos em `adb devices` ou `emulator -list-avds`. Cliques, teclado, leitor de tela, aparência e restauração real continuam pendentes.

## Continuação local — edição e compensação de metas/empréstimos

| Antes | Depois | Motivo |
| --- | --- | --- |
| Detalhes não oferecem edição | Formulário de nome, valor de referência/meta e prazo opcional | Permitir corrigir o cadastro sem reescrever movimentações |
| Principal editado não afeta saldo calculado pelas movimentações | Ajuste pela diferença, com registro dos valores anterior e novo em Atividade | Tornar a correção de referência efetiva e rastreável |
| Compensação existe apenas como coluna interna | Saldo desejado explícito, incluindo zero; mensagem explica que não é pagamento nem movimentação de conta | Permitir regularização manual sem inventar fluxo de caixa |
| Arquivados desaparecem sem caminho de recuperação | Cadastros mostram status e detalhes permitem restaurar | Preservar histórico e tornar arquivamento reversível |
| Progresso do empréstimo diz “Quitado” mesmo com compensação | “Redução do saldo” e “Saldo zerado” | Não confundir ajuste administrativo com pagamento |
| Atividade só resolve entidades de transações | Ajustes mostram empréstimo e valores anterior/novo; erro tem recuperação | Exibir um registro legível, não códigos internos |

- Atualizações de referência e compensação são exclusivas e atômicas com o registro de atividade; falha no registro reverte o saldo/cadastro.
- Pagos e pendentes, valores de transações, contas, notas e datas permanecem inalterados. Pagamentos posteriores reduzem o saldo já compensado.
- Quando não há movimentações sobreviventes, o principal novo entra uma só vez na base; teste cobre esse ramo.
- Natureza da meta e direção do empréstimo permanecem as definidas na criação; alteração desses campos e exclusão definitiva dos cadastros ainda não estão implementadas.
- Campo monetário compartilhado deixa de converter entrada inválida/excessiva silenciosamente em zero. O editor identifica valores por rótulos acessíveis; erros preservam o formulário.
- 63 testes, TypeScript e `git diff --check` passaram. Export Android aprovado após o último ajuste (3.318 módulos; bundle Hermes gerado).
- Mudanças locais, não publicadas em nova release. QA nativo e tratamento seguro de edição/exclusão do desembolso inicial legado permanecem pendentes; nenhum vínculo inicial foi inferido por nome, data ou valor.

## Lote beta.3 — desembolso inicial e edição de lançamentos

- Esquema 5 identifica o desembolso de empréstimos novos; migração mantém legados sem classificação. Identificação manual valida direção, status e vínculo, preservando saldo bruto, compensações e movimentações.
- Excluir o desembolso identificado remove a movimentação da conta, não a dívida. Editar seu valor ajusta a referência pela diferença, com rollback conjunto e registro de atividade.
- UI explica consequências e permite identificar/revisar o vínculo. Desembolso identificado deve permanecer pago, na mesma direção e empréstimo.
- Edição de lançamentos preserva metadados omitidos e horário ao mudar apenas a data; falha de feedback tátil não transforma uma gravação bem-sucedida em erro financeiro.
- Backups aceitos: v3/v4/v5; downgrade após migração não é suportado. A restauração nativa continua pendente de prova em dispositivo.
- Os lotes descritos acima como locais são incluídos nesta preparação da beta.3. Publicação e APK devem ser conferidos separadamente.
- 72 testes automatizados, TypeScript e exportação Android passaram na preparação da beta.3 (3.318 módulos; bundle Hermes). Crédito excedente após identificação manual e mudança de data sem perda de horário têm testes dedicados.
- APK beta.3 universal compilado; assinatura v2 válida, versionCode 17 e quatro arquiteturas conferidos. Tamanho e SHA-256 registrados nas notas da release; nenhuma validação nativa de uso foi presumida a partir do build.
