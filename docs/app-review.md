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

## Continuação após a beta.3 — validação de lançamentos (local)

Não faz parte do APK beta.3 publicado. Revisão integral permanece aberta.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Repositório aceita zero, centavos fracionários/fora do limite seguro, datas impossíveis e categoria incompatível | Validação compartilhada antes de criar ou editar, em transação exclusiva | Evitar registros financeiros inválidos mesmo fora do formulário |
| Novos vínculos podem apontar para cadastros inexistentes ou arquivados | Validação de conta, categoria, meta, empréstimo e recorrência | Evitar movimentações órfãs e seleção de referências indisponíveis |
| Conta omitida é sempre o ID fixo `principal` | Resolver conta principal ativa atual | Evitar gravar na conta antiga/arquivada |
| Cadastro arquivado pode bloquear uma correção histórica | Edição permite manter referências históricas arquivadas; nova atribuição continua bloqueada | Preservar histórico sem tornar lançamentos existentes inacessíveis |
| Entrada rápida mostra erro genérico | Mensagem explica a rejeição e mantém campos preenchidos | Permitir recuperação informada, seguindo Intent |

- Onze falhas reproduzidas inicialmente com SQLite real em memória. Correção passou nos 84 testes completos; TypeScript aprovado.
- Exportação Android passou após o ajuste final do formulário (3.318 módulos; bundle Hermes). `git diff --check` aprovado. Sem mudança de versão do app ou esquema do banco neste lote.
- Sugestões bancárias continuam idempotentes mesmo após arquivar a conta. O teste anterior com mock parcial foi substituído por gravação SQLite real.
- A validação não reescreve nem exclui dados antigos. Metas mantêm a semântica de progresso pelo tipo; transferências e correções continuam fora do progresso.
- Recuperação de referências foi implementada no lote seguinte. Seleção múltipla/tags/duplicação, fluxos especiais de transferência/correção e prova de interação nativa permanecem pendentes. Testes do repositório não comprovam teclado, leitor de tela, aparência ou clique em dispositivo.

## Lote beta.4 — referências e recuperação dos formulários

| Antes | Depois | Motivo |
| --- | --- | --- |
| Falha de consulta deixa seletores vazios sem recuperação | Estado de carregamento, erro real e nova tentativa sem apagar campos | Distinguir indisponibilidade de ausência de cadastro |
| Cadastro original arquivado desaparece na edição | Conta e categoria originais permanecem selecionáveis, com rótulo de arquivamento | Evitar reclassificação silenciosa do histórico |
| Pré-preenchimento tardio substitui dados digitados | Aplicar sugestões somente a campos ainda não editados | Preservar a intenção do usuário |
| Retorno do gerenciamento mantém referências antigas | Atualização ao recuperar foco, ignorando consultas obsoletas | Permitir criar um cadastro e continuar o formulário |
| Seleção reduz escala mesmo com redução de movimento | Escala somente quando movimento está permitido; feedback de opacidade permanece | Respeitar acessibilidade sem retirar resposta ao toque |

- 89 testes automatizados passaram e TypeScript aprovado. Novos testes usam SQLite real para preservação de referências, recuperação da consulta e pré-preenchimento; não são prova de execução do hook ou interação nativa.
- Lotes locais posteriores à beta.3 são incluídos na preparação da beta.4, versionCode 18. Banco permanece no esquema 5; não há reescrita de dados antigos.
- Exportação Android aprovada com 3.321 módulos; APK universal compilado em 6m30s, assinatura v2, versão 18/beta.4 e quatro arquiteturas verificadas. Tamanho e SHA-256 registrados nas notas da release.
- QA nativo de foco, teclado, leitor de tela, falhas de consulta e criação/retorno de cadastros permanece pendente. Revisão integral e fidelidade ao Cashew seguem abertas.

## Continuação após a beta.4 — transferência (local)

Não faz parte do APK beta.4 publicado. Revisão integral permanece aberta.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Repositório aceita centavos fracionários/fora do limite seguro e datas inválidas | Rejeição antes de gravar qualquer parte da transferência | Preservar integridade dos dois saldos |
| Seleção inicial pode usar a mesma conta nos dois lados | Resolver origem e destino juntos, mantendo escolhas válidas e mesma moeda | Evitar destino invisível ou incompatível |
| Consulta de contas falha sem estado de recuperação | Carregamento, erro real, nova tentativa e gerenciamento quando faltam contas | Permitir recuperação sem apagar valor e descrição |
| Botão admite novo envio durante a gravação | Trava síncrona, estado ocupado e botão desabilitado | Evitar pares duplicados por toques repetidos |
| Valor usa campo decimal distinto do restante do app | Máscara monetária compartilhada | Manter entrada em centavos consistente |

- Quatro falhas reais reproduzidas antes da correção. Testes antigos de transferência com mocks foram substituídos por SQLite real, verificando par balanceado, saldos, exclusão vinculada e rollback quando a segunda parte falha.
- 97 testes passaram, TypeScript e `git diff --check` aprovados. Exportação Android gerou bundle Hermes com 3.322 módulos.
- Seleção exclui conta arquivada, conta de origem e moeda incompatível; falhas preservam os campos. Testes de seleção e repositório não comprovam trava de toque, foco, teclado ou recuperação visual em dispositivo.
- Não há mudança de versão, migração, exclusão ou reescrita de dados existentes. Recuperação de contas/categorias e correção de saldo foram implementadas nos lotes seguintes; demais lacunas do plano continuam abertas.

## Continuação após a beta.4 — recuperação de contas e categorias (local)

| Antes | Depois | Motivo |
| --- | --- | --- |
| Cadastros arquivados desaparecem do gerenciamento | Filtros Ativos/Arquivados com contagem e ação de restauração | Tornar o arquivamento recuperável |
| Não existe operação de restauração | Reativação exclusiva e idempotente por ID | Recuperar o cadastro original, não criar uma cópia |
| Arquivar categoria pode separar filhos antes de uma falha | Arquivamento exclusivo com rollback conjunto | Preservar a hierarquia caso a operação falhe |
| Reordenação não apresenta erro nem estado ocupado | Trava síncrona, estado de atualização e erro explícito | Evitar ações concorrentes e rejeições sem tratamento |

- 102 testes e TypeScript passaram. SQLite real comprova preservação de saldo, movimentos, conta principal, hierarquia sobrevivente e rollback do arquivamento.
- Exportação Android aprovada após o último ajuste visual (3.322 módulos, bundle Hermes); `git diff --check` aprovado.
- Restauração de conta não a torna principal. Categoria mantém pai ativo compatível; referências inválidas tornam-na principal. Relações removidas no arquivamento anterior não são reconstruídas nem inferidas.
- Seletores de novos lançamentos continuam excluindo arquivados por padrão. Cadastros arquivados não oferecem edição, reordenação ou promoção a principal antes de restaurar.
- Lote local, não incluído na beta.4 publicada. Sem nova versão, migração ou publicação. Prova de interação nativa e revisão integral permanecem pendentes.

## Continuação após a beta.4 — correção de saldo (local)

| Antes | Depois | Motivo |
| --- | --- | --- |
| Movimentação `correction` não afeta saldo de conta | Correção paga soma/subtrai do saldo; pendente não afeta | Dar efeito financeiro ao tipo existente sem contaminar receitas/despesas |
| Não há fluxo para corrigir saldo | Opções de conta oferecem tela com saldo atual, novo saldo assinado, motivo e confirmação | Ajustar por diferença sem reescrever saldo inicial ou transações anteriores |
| Confirmação pode usar saldo antigo | Comparação do saldo consultado dentro de transação exclusiva | Rejeitar ajuste obsoleto e preservar o valor digitado |
| Atividade só resolve empréstimos e transações | Nome da conta e valores anterior/novo no registro de correção | Tornar ajustes administrativos legíveis e auditáveis |
| Detalhes não explicam efeito da exclusão | Correção mostra motivo e explica que excluir reverte seu efeito | Informar o impacto antes da ação financeira |

- Correção e auditoria são atômicas. Ajustes concorrentes ao mesmo alvo não duplicam movimentações; saldo negativo e zero são aceitos. Valores/diferenças fora do limite inteiro seguro e contas inexistentes/arquivadas são rejeitados.
- 108 testes, TypeScript, exportação Android (3.323 módulos, Hermes) e `git diff --check` aprovados. SQLite real cobre totais do período, preservação de histórico, reversão por exclusão, confirmação obsoleta e rollback da auditoria.
- Mudança de cálculo também aplica correções pagas já existentes/importadas; esses registros antes eram ignorados no saldo. Não há migração nem reescrita do banco. Pendentes permanecem excluídos, e correções continuam fora de orçamentos, metas e empréstimos.
- Modal de opções de conta reutiliza a apresentação e redução de movimento existentes. Intenção orienta confirmação explícita e preservação dos campos; acabamento mantém controles e hierarquia do app.
- Lote local, não publicado. QA nativo da confirmação, teclado, foco, leitor de tela, retorno de modal e exclusão continua pendente; prova de repositório/bundle não comprova essas interações. Atalho por pressão longa no botão flutuante e paridade integral ainda não concluídos.

## Continuação após a beta.4 — título, notas e tags (local)

| Antes | Depois | Motivo |
| --- | --- | --- |
| Tags existem na coluna, mas não no modelo de leitura/escrita | Repositório expõe e persiste tags; campos omitidos preservam JSON original | Disponibilizar metadados sem apagar conteúdo legado |
| Descrição editada substitui título | Título e notas têm campos independentes | Preservar título ao corrigir somente a descrição |
| Entrada rápida não oferece metadados adicionais | Grupo recolhido de título, notas e tags | Oferecer detalhe sem sobrecarregar o caminho rápido |
| Não há edição de tags | Adição e remoção acessíveis, com limites e mensagens de erro | Tornar tags utilizáveis e impedir gravações inválidas |
| Busca ignora tags | Busca inclui tags e mantém os demais filtros | Encontrar lançamentos pelos metadados cadastrados |

- 113 testes passaram e TypeScript aprovado. SQLite real comprova gravação, preservação por omissão, limpeza explícita e rollback de tags inválidas. JSON legado inválido é apresentado como lista vazia, mas não é reescrito numa edição sem alteração de tags.
- Exportação Android aprovada após o último ajuste (3.325 módulos, Hermes); `git diff --check` aprovado.
- Tags novas são normalizadas em Unicode, espaços e duplicação sem diferenciar maiúsculas/minúsculas. Limites: 20 tags, 50 caracteres por tag. Tag ainda digitada é incluída ao salvar, mesmo sem acionar Adicionar.
- Título nulo explícito na criação não copia a descrição. O default por descrição permanece quando título é omitido.
- Fluxo do editor de metadados é para lançamentos comuns. Round-trip de tags por CSV foi implementado no lote seguinte; editores de transferências/correções e filtro específico por tag permanecem pendentes.
- Lote local, não publicado, sem migração ou mudança de versão. QA nativo de expansão, teclado, foco, remoção e leitura das tags permanece aberto, assim como a revisão integral e fidelidade ao Cashew.

## Continuação após a beta.4 — CSV de metadados e integridade (local)

| Antes | Depois | Motivo |
| --- | --- | --- |
| Exportação não inclui tags nem horário | Colunas de tags JSON e timestamp em milissegundos | Preservar metadados e instante exato na ida e volta |
| Importação preenche título vazio com descrição | Título vazio explícito fica nulo; fallback somente quando a coluna não existe | Não inventar título ao reimportar |
| Valores com letras/espaçamento ambíguo são convertidos em números | Formato monetário estrito e cabeçalhos únicos | Rejeitar valores financeiros ambíguos |
| Correspondência por nome escolhe entre cadastros equivalentes | Importação rejeita ambiguidade ativa de contas/categorias | Não atribuir movimentação a um cadastro por suposição |
| Grupo de transferência pode combinar pares diferentes | Verificar grupo existente antes de qualquer gravação | Preservar a identidade do par e a exclusão conjunta |

- 119 testes passaram. SQLite real comprova ida e volta de título, notas multilinha, tags com vírgulas e timestamp, reimportação idempotente e rollback de movimentações/cadastros/atividade se uma linha posterior falhar.
- TypeScript e exportação Android aprovados após o último ajuste (3.328 módulos, Hermes); `git diff --check` aprovado.
- Serviço nativo de arquivo é carregado somente na inspeção do arquivo; o caminho de gravação SQLite foi testado sem simular o banco.
- Tags incompatíveis/corrompidas bloqueiam a exportação com orientação de backup completo. Essa proteção no serviço de arquivo foi revisada em código; compartilhamento e acesso nativo ao arquivo não foram exercitados em dispositivo.
- CSV de movimentações não é backup integral: saldo inicial, moeda, hierarquia, vínculos com metas/empréstimos e regras de recorrência não são reconstruídos. Confirmação informa essas diferenças; recuperação integral deve usar backup do banco.
- Lote local, não publicado, sem nova versão ou migração. Compartilhamento, escolha de arquivo e confirmação ainda exigem QA nativo; revisão integral e fidelidade às referências permanecem abertas.

## Preparação da beta.5 — duplicação com revisão e entrega

| Antes | Depois | Motivo |
| --- | --- | --- |
| Não há duplicação de lançamento comum | Editor pré-preenchido abre em modo de cópia; grava só ao confirmar | Reutilizar dados sem criar lançamento involuntário |
| Cópia poderia carregar identidade e automação | Novo ID, sem fonte bancária, recorrência ou propriedade de desembolso inicial | Preservar idempotência e integridade dos vínculos |
| Referências originais arquivadas poderiam ser substituídas implicitamente | Exige seleção ativa explícita ou remoção de vínculo opcional | Não atribuir movimento a cadastro por suposição |
| Falha específica de exportação é escondida por mensagem genérica | Mensagem real orienta revisão de tags/backup | Dar ação concreta ao usuário sem perder os dados |

- 122 testes e TypeScript aprovados na revisão pré-release. SQLite real comprova preview sem gravação, nova identidade após confirmação e preservação do original. Transferências e correções não são copiadas parcialmente; desembolso inicial não cria outro empréstimo.
- Os lotes descritos anteriormente como locais são incluídos na preparação de `v1.2.0-beta.5`; evidência final de build/publicação fica em `docs/release-v1.2.0-beta.5.md`. Os registros locais anteriores representam o estado em que cada lote foi verificado.
- Segurança do delta: revisão estática concluída, sem achados reportáveis; 14 ocorrências moderadas transitivas do npm continuam abertas. Sem nova migração. QA de navegação, confirmação, teclado, foco e leitor de tela ainda depende de aparelho/emulador; o objetivo integral permanece ativo.

### Correção encontrada no preflight da beta.5

| Antes | Depois | Motivo |
| --- | --- | --- |
| Verificador rejeita a versão beta instalada | Comparação semântica aceita pré-release, respeita números/estável e ignora metadata de build | Consultar atualização estável sem erro ou downgrade |

- Dois testes reproduziram `Formato de versão inválido.` antes da correção. Após o patch, 124 testes, TypeScript e exportação Android passaram (3.329 módulos, Hermes). APK final recompilado em 1m33s, assinatura v2 válida, versão beta.5/code 19 e quatro ABIs; o primeiro build anterior ao patch não é o artefato de entrega. Hash e tamanho estão nas notas da release.
- Endpoint da consulta e validação do digest não mudam; instalação de pré-releases continua manual. Ferramentas de grafo da skill `review-delta` não estão disponíveis nesta sessão; revisão foi feita por diff e busca direta dos consumidores, sem alegar execução de grafo.
