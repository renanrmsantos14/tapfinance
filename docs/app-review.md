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

### Lote local após beta.5 — integridade do saldo inicial de contas

| Antes | Depois | Motivo |
| --- | --- | --- |
| Repositório aceita centavos fracionários ou inseguros na criação/edição | Valida inteiro seguro antes de qualquer SQL | Impedir perda de precisão e saldo inconsistente mesmo fora do formulário |
| NaN gera erro técnico do SQLite | Erro específico orienta corrigir o saldo inicial | Preservar o cadastro original e informar a causa |

- Dois testes reproduziram gravação indevida de centavos fracionários antes do patch; três testes novos usam SQLite real para rejeição sem alterações, preservação do original, valores negativos/zero e limites seguros.
- 127 testes e TypeScript aprovados. Sem alteração de esquema, moeda, UI ou registros existentes; valores históricos inválidos não são corrigidos automaticamente.
- Lote exclusivamente local: não incluído no APK/release beta.5 já publicado. A revisão de moeda, tipo de conta, concorrência da conta principal e apresentação monetária segue pendente. QA nativo continua sem prova.

### Lote local após beta.5 — troca da conta principal

| Antes | Depois | Motivo |
| --- | --- | --- |
| Transação compartilhada pode receber consultas de outras ações | Consultas executam no objeto da transação exclusiva | Isolar validação e troca dos indicadores |
| Duas chamadas simultâneas disputam a transação | Fila por conexão, inclusive após uma falha | Evitar sobreposição sem engolir erros do chamador |
| Todos os cadastros recebem novo timestamp | Apenas a principal anterior e o destino são atualizados | Preservar alterações de cadastros não envolvidos |

- Falha concorrente reproduzida antes do patch. Testes em SQLite real confirmam uma principal ativa, saldos preservados, rollback após falha forçada, rejeição de destino ausente e recuperação da fila após falhas. Instrumentação confirma que duas chamadas não entram simultaneamente na API nativa; não depende apenas da fila do adaptador de testes.
- 129 testes e TypeScript aprovados. API exclusiva verificada na documentação Expo SDK 57; não se presume que ela serialize automaticamente chamadas concorrentes. Escritas de outros fluxos ainda podem produzir erro de bloqueio e devem ser tratadas pelo formulário.
- Exclusivamente local, sem novo APK/publicação. Concorrência de criação de contas, moeda/tipo e QA de troca real no dispositivo seguem pendentes; o item de troca da principal da lista anterior foi tratado neste lote.

### Lote local após beta.5 — carregamento de cadastros

| Antes | Depois | Motivo |
| --- | --- | --- |
| Tela atualiza itens antes de concluir contas/categorias | Serviço entrega o conjunto somente após todas as leituras | Não publicar estado parcialmente carregado |
| Resposta antiga pode encerrar loading ou sobrescrever outra consulta | Sequência por carregamento e invalidação ao perder foco | Preservar a resposta mais recente |
| Contas/categorias ativas são consultadas novamente | Listas ativas derivam da leitura completa já realizada | Remover consultas repetidas sem perder arquivados |
| Adicionar permanece acionável com seletores ainda indisponíveis | Desabilitado durante carga/erro/gravação, com indicação acessível e feedback | Evitar formulário com escolhas antigas ou incompletas |

- Três testes em SQLite real verificam arquivados na lista, exclusão dos seletores ativos, três consultas para contas, rejeição integral diante de falha e nova tentativa; verificam também rotas de metas, empréstimos e recorrências vazias. Não equivalem a testes renderizados de corrida de foco.
- 132 testes e TypeScript aprovados, diff sem erros. Código reutiliza a sequência já existente no editor de lançamentos; nenhum framework novo. O conjunto retornado é completo para publicação em estado React, não uma garantia de snapshot transacional simultâneo entre consultas.
- Lote local, fora da beta.5 publicada. Cliques, foco, troca rápida de rota, erro/retry e acessibilidade no dispositivo ainda precisam de QA nativo.

### Pedido específico — seletor de versões, incluindo betas

| Antes | Depois | Motivo |
| --- | --- | --- |
| Consulta somente `/releases/latest`, excluindo betas | Consulta catálogo paginado de releases publicadas | Oferecer também pré-releases |
| Baixa imediatamente a versão encontrada | Modal com escolhas, canal, tamanho e notas; botão Baixar confirma a selecionada | Usuário escolhe a versão, sem download automático |
| Apenas compara com a release estável | Ordenação semântica de todas as versões elegíveis | Beta.10 vem depois de beta.9; bloquear downgrade |
| Falha encerra sem preservar seleção | Falha de download fica no seletor, permitindo repetir ou escolher outra versão | Não perder a escolha nem baixar duplicado |

- Somente versões mais novas, publicadas, com `app-release.apk`, origem exata deste repositório, tamanho compatível com instalador (até 200 MB) e SHA-256 válido entram na lista. Rascunhos, identidade malformada e APK incompleto/sem digest ficam fora. Versão instalada e anteriores não são oferecidas; downgrade pode quebrar o esquema SQLite.
- Consulta paginada (100 por página, até 20 páginas com erro explícito se exceder); timeout cobre fetch e leitura do corpo. Falha numa página rejeita o catálogo inteiro. Fechar consulta invalida respostas tardias; refs impedem download duplicado. Download mantém seleção e usa o instalador nativo existente, que verifica o hash e pede confirmação ao Android.
- 135 testes, TypeScript e exportação Android aprovados (3.331 módulos, Hermes). Três testes novos cobrem seleção/ordenação, origem/digest/draft, paginação e falhas HTTP. Catálogo real obtido pelo GitHub CLI confirma beta.5 e beta.4 como opções para uma instalação beta.3; fetch direto pelo Node retornou `fetch failed`, portanto não é prova de rede no Android.
- Sem dispositivo/emulador: modal, toque/foco/acessibilidade, download e instalação efetiva ainda não testados nativamente. Lote local, não presente na beta.5 publicada. Para habilitar este seletor no aparelho, será necessária uma instalação inicial do próximo APK; depois ele oferecerá releases novas estáveis e betas.
- Contrato das próximas releases: incrementar versão semântica (incluindo identificador beta), incrementar `android.versionCode`, publicar APK universal como `app-release.apk` e verificar digest no GitHub antes de publicar a release. Beta não precisa virar Latest para aparecer no seletor.

### Lote local após beta.5 — data e hora dos lançamentos

| Antes | Depois | Motivo |
| --- | --- | --- |
| Cadastro manual grava somente o horário atual, sem escolha | Campos DD/MM/AAAA e HH:mm com ação Usar data e hora atuais | Registrar lançamentos em outra data/hora explicitamente |
| Editor permite mudar só o dia | Componente compartilhado permite ajustar dia e horário | Completar o timestamp editável sem alterar outros dados |
| Teclado numérico não oferece os separadores exigidos | Campos permitem digitar barra e dois-pontos; formato e rótulo acessível explícitos | Evitar controle impossível de preencher |

- Cadastro manual não alterado usa Date.now ao salvar; sugestões bancárias mantêm o timestamp original. Campos alterados usam data/hora escolhidas, sem descartar rascunho inválido. Edição sem mudança preserva segundos e milissegundos; mudança apenas de dia mantém esses valores, mudança de hora/minuto os zera. Horário inexistente por transição de fuso é rejeitado, não normalizado silenciosamente.
- Quatro testes cobrem preservação, meia-noite/23:59, valores inválidos e persistência SQLite real na criação/edição. 139 testes e TypeScript aprovados. Usa horário local do aparelho, mantendo o contrato atual, não uma conversão implícita para outro fuso.
- Local, fora da beta.5 publicada. São campos textuais, não calendário/picker nativo; teclado, foco, retorno de erro e escalabilidade visual ainda sem QA no dispositivo. Objetivo integral permanece aberto.

### Lote local após beta.5 — filtro exato por tag

| Antes | Depois | Motivo |
| --- | --- | --- |
| Tags só são encontradas na busca textual parcial | Seletor de tag exata e opção Sem tags | Não confundir Viagem com Viagem executiva ou palavra na descrição |
| Não há indicação/limpeza de filtro por tag | Participa do indicador de filtros ativos e Zerar filtros | Mostrar e desfazer o recorte aplicado |
| Tags equivalentes podem virar opções repetidas | Normalização Unicode/espaços/caixa, preservando rótulo e seleção | Agrupar sem alterar metadados históricos |

- Duas falhas reproduzidas antes do patch. Dois testes novos cobrem correspondência exata, combinação com busca/situação/natureza, sem tags, Unicode, deduplicação e preservação de seleção que desapareceu do histórico. O seletor usa tags dos lançamentos carregados, não inventa um catálogo independente.
- 141 testes e TypeScript aprovados. Lista e totais compartilham `filteredItems`; regra existente dos totais permanece restrita a lançamentos comuns pagos, excluindo transferências/correções/pendências. Opções novas têm alvo mínimo de 44 e feedback ao pressionar.
- Lote local, não incluído na beta.5. Renderização, seleção/limpeza real por toque/foco e comportamento com fonte ampliada ainda sem QA no dispositivo; filtros de várias tags simultâneas não foram implementados neste lote.

### Lote local após beta.5 — criar lançamentos pendentes

| Antes | Depois | Motivo |
| --- | --- | --- |
| Cadastro rápido omite situação e sempre grava pago | Seletor explícito Pago/A pagar ou Recebido/A receber | Planejar pendências sem alterar saldo realizado |
| Editor e cadastro têm controles distintos | Componente compartilhado com explicação do efeito no saldo | Mesma linguagem e alvos mínimos de 44 |
| Receita é exibida genericamente como paga | Rótulo Recebido, sem mudar o status técnico paid | Tornar a direção financeira clara |

- Repositório já suportava pending; testes de base passaram antes da alteração da UI. Dois testes SQLite reais verificam receitas/despesas pendentes, confirmação, reversão para pendente, totais realizados, metadados e identidade sem duplicação. Não se afirma que a regra contábil estava quebrada; faltava acesso no cadastro.
- 143 testes passaram; TypeScript aprovado após tratamento do retorno opcional do resumo nos testes. Desembolso inicial continua com situação bloqueada no editor. Sugestões bancárias iniciam confirmadas como antes, mas a situação é revisável pelo usuário. A data não altera a situação automaticamente.
- Local, fora da beta.5 publicada. Confirmação real, labels de leitor de tela, fonte ampliada e feedback ainda precisam de QA nativo. Objetivo integral continua aberto.

### Lote local após beta.5 — criação concorrente e posição de contas

| Antes | Depois | Motivo |
| --- | --- | --- |
| Consulta e inserção separadas podem criar duas principais | Transação exclusiva, enfileirada por conexão junto à troca da principal | Escolher a primeira conta do catálogo ativo sem disputa |
| Posição usa quantidade de contas ativas | Nova posição vem após a maior posição armazenada, incluindo arquivadas | Não reutilizar posição após arquivamento |
| Criar dentro da importação poderia abrir transação aninhada | Variante explícita para a transação exclusiva já aberta pelo CSV | Preservar rollback do arquivo inteiro |

- Dois testes reproduziram principal dupla e posição repetida antes do patch. Três testes SQLite reais verificam principal única, posições distintas, preservação de cadastros, fila antes da API nativa e recuperação após inserção abortada por trigger. Testes de CSV/rollback e troca da principal continuam aprovados.
- Suíte e TypeScript aprovados; nenhuma migração ou reordenação de registros existentes. Não corrige automaticamente duplicidades históricas nem cobre coordenação entre conexões diferentes; falhas de bloqueio continuam explícitas ao chamador.
- Lote local, fora da beta.5. Concorrência nativa/dispositivo, revisão de tipo/moeda e restante da revisão integral continuam pendentes.

### Lote local após beta.5 — estados da visão geral

| Antes | Depois | Motivo |
| --- | --- | --- |
| Cartões exibem zeros iniciais mesmo antes da consulta/falha | Carga e falha ficam separadas do conteúdo financeiro | Não apresentar ausência de prova como saldo consultado |
| Uma resposta antiga pode sobrescrever recarga mais recente | Sequência de consultas e invalidação ao sair da tela | Manter somente resultado válido da última carga |
| Próximos itens dependem de inverter o fim da lista | Ordenação explícita das três pendências comuns mais próximas | Clareza e exclusão de correções/transferências legadas pendentes |

- Serviço reúne consultas para publicar o conjunto completo em React; não promete snapshot SQL simultâneo entre leituras. Dois testes SQLite reais verificam limites do mês local, recentes, próximas pendências, exclusão de pagos futuros da lista de próximos e rejeição/retry de uma consulta parcial.
- 148 testes e TypeScript aprovados. Totais mantêm o contrato existente: lançamentos comuns pagos no mês, inclusive um lançamento futuro explicitamente marcado pago; contas têm saldo acumulado, não saldo mensal. Não há seletor de mês na home ainda; histórico já tem navegação de mês.
- Lote local, fora da beta.5 publicada. Corrida de foco/renderização, pull-to-refresh, fonte ampliada e anúncios acessíveis aguardam QA nativo. A navegação ao perder foco e outras consultas simultâneas não foram comprovadas no Android.
- Exportação Android final deste lote aprovada: 3.334 módulos, bundle Hermes `entry-5d8e8c6b3903c9194ed651f0c062f7d4.hbc`. Inclui as mudanças locais acumuladas, mas não é um novo APK publicado nem prova de uso no dispositivo.

### Lote local após beta.5 — moeda dos valores individuais

| Antes | Depois | Motivo |
| --- | --- | --- |
| Saldos USD/EUR aparecem com símbolo R$ | Formatação usa código da moeda da conta | Não rotular outra unidade financeira como reais |
| Consulta de lançamento omite moeda | Join retorna accountCurrency, sem coluna/migração nova | Propagar a unidade original até histórico/editor |
| Entradas e confirmações individuais assumem BRL | Conta, histórico, criação/edição, transferência e correção mostram a unidade da conta | Usuário revisa o valor na unidade correta |

- Dois testes reproduziram ausência de formatação por moeda e falta da moeda no lançamento consultado. Testes cobrem zero/negativo, BRL/USD/EUR, código malformado sem fallback enganoso para R$, e SQLite preservando centavos e moeda original. 150 testes passaram; TypeScript aprovado.
- Formatação mantém duas casas e armazenamento em centavos; outras moedas usam código, não símbolo ambíguo. Valida formato do código, não catálogo ISO ou quantidade de casas de cada moeda. Não converte valores nem altera dados; mudar a conta não calcula câmbio.
- Limitação financeira importante: totais agregados do mês, orçamentos/metas, empréstimos, recorrências e eventos de atividade ainda precisam de política consistente por moeda. Esta mudança de valores individuais não prova suporte integral a múltiplas moedas nem autoriza somar BRL/USD como a mesma unidade. Pendência de alta prioridade antes de declarar versão estável.
- Local, fora da beta.5. Renderização/entrada com moedas longas, leitor de tela e confirmação real de correção/transferência ainda aguardam QA nativo.

### Lote local após beta.5 — totais mensais separados por moeda

| Antes | Depois | Motivo |
| --- | --- | --- |
| Home e histórico somam centavos BRL/USD/EUR e exibem R$ | Receitas, despesas e saldo têm grupos independentes por moeda | Não somar unidades financeiras diferentes sem câmbio |
| Histórico exibe totais antes da conclusão da carga ou após falha | Totais só aparecem após consulta bem-sucedida | Não apresentar zero inicial ou dados antigos como saldo confirmado |
| Soma pode exceder a precisão inteira do JavaScript | Agregação rejeita valores/somas fora do limite seguro | Não exibir arredondamento como valor financeiro exato |

- Home considera lançamentos do mês local, inclusive contas arquivadas com histórico, e mantém moedas das contas ativas mesmo sem movimentos. Histórico calcula por moeda após aplicar os filtros; pendências, transferências e correções não entram nas receitas/despesas realizadas. Grupos com somente esses itens ficam zerados na moeda correta. Sem conversão, migração ou alteração do histórico financeiro.
- Três testes novos cobrem SQLite com BRL/USD/EUR, conta arquivada, limites de mês, filtro por conta, exclusões e estouro numérico. Os dois testes de carga da home foram adaptados ao contrato explícito por moeda. TypeScript e os 153 testes passaram.
- A função antiga getMonthSummary não tem consumidores de produção neste lote; permanece para testes legados e ainda não é contrato seguro para múltiplas moedas. Relatórios, calendário, orçamentos, metas e empréstimos ainda exigem revisão consistente; suporte integral a múltiplas moedas não está concluído.
- Mudanças locais, fora da beta.5 publicada. Layout com vários grupos, fonte ampliada, leitor de tela e interação em dispositivo ainda não foram validados. Não há dispositivo/emulador disponível nesta sessão.
- Exportação Android deste lote aprovada: 3.335 módulos, Hermes `entry-5a81de4caf47b1f1f722c50dd74ce9fb.hbc`. Não constitui APK instalado, novo release ou validação nativa.

### Lote local após beta.5 — relatórios por moeda e período

| Antes | Depois | Motivo |
| --- | --- | --- |
| Relatório soma unidades diferentes e percentuais globais | Totais, categorias e percentuais independentes por moeda | Representar a unidade original sem inventar câmbio |
| Somente o mês da abertura da tela, sem navegação | Botões de mês anterior/próximo | Consultar histórico mensal, não apenas o mês atual |
| Breakdown descarta categorias após a oitava | Todas as categorias de despesa do período | Não esconder parte do gasto informado no total |
| Zero inicial e falha sem recuperação | Carga, erro/retry e conteúdo confirmado separados | Evitar números falsamente confirmados e saída sem recuperação |

- Serviço reutiliza a agregação monetária segura, mantém histórico de contas/categorias arquivadas, exclui pendências/transferências/correções e publica o resultado completo somente após ambas as consultas. Não é snapshot SQL transacional entre leituras; consulta o histórico inteiro e filtra o mês em memória, pendente otimização para bases muito grandes.
- A tela invalida consultas antigas ao trocar o mês ou perder foco; setLoading ocorre no clique de mudança de mês para não exibir o relatório anterior sob o mês novo. Voltar e setas têm feedback e alvo mínimo de 44 px. Percentuais usam o total da própria moeda; arredondamento visual pode somar 99/101%.
- Três testes SQLite reais cobrem BRL/USD, percentuais 75/25, histórico arquivado, limites de mês, nove categorias sem truncamento, consulta com falha e retry e período inválido. TypeScript e os 156 testes passaram. O primeiro teste de nove categorias teve erro de fixture (coluna inexistente updated_at), corrigido conforme schema real; não foi erro do app.
- O Intent orientou recuperação visível e separação entre carga e números confirmados. Navegação rápida de meses, foco, fonte ampliada, leitor de tela e layout multimoeda ainda aguardam teste no dispositivo; testes de serviço não comprovam renderização/interação React Native. Local, fora da beta.5 publicada. Calendário, orçamentos/metas e empréstimos ainda precisam de política monetária consistente.
- Exportação Android deste lote aprovada: 3.336 módulos, Hermes `entry-4317f53f999619cab635a40768363849.hbc`. Nenhum novo APK/release publicado.

### Lote local após beta.5 — calendário selecionável e fluxo por moeda

| Antes | Depois | Motivo |
| --- | --- | --- |
| Saldo mistura moedas e ponto usa soma diária incluindo pendências | Fluxo realizado por moeda; ponto neutro indica presença de movimentos | Não representar soma de unidades diferentes como saldo ou cor positiva/negativa |
| Dias somente visuais | Seleção de dia filtra movimentos; ação para ver mês inteiro | Tornar o calendário útil para consulta diária |
| Falha deixa lista antiga/zerada e mostra apenas alerta | Estado de carga, erro com retry e dados confirmados separados | Não exibir conteúdo anterior sob um mês novo nem zero não consultado |

- Serviço mantém o comportamento existente de materializar recorrências antes da leitura, incluindo projeção de pendências até 45 dias futuros. Depois carrega transações/contas e monta conjunto completo. Histórico arquivado é mantido; fluxo inclui somente lançamentos comuns pagos, não essa projeção pendente. Leitura não é snapshot SQL transacional e ainda consulta todo o histórico em memória.
- Calendário usa segunda-feira como início e semanas completas, incluindo fevereiro bissexto. Ponto inclui pendências, transferências e correções como presença, não como fluxo. Texto explica a distinção; fluxo permanece mensal ao selecionar dia. Troca de mês limpa seleção e invalida respostas antigas; sair da tela invalida consultas. Dias ficam desabilitados durante carga/falha.
- Testes novos verificam 35/42 células, ano bissexto, mês inválido, BRL/USD e histórico arquivado, pendência fora do fluxo mas presente no dia, limites locais de dia/mês, dia inválido e consulta com falha/retry. TypeScript e 159 testes aprovados.
- Setas e retorno têm alvo mínimo de 44 px; células de dia têm 44 px de altura, largura proporcional a sete colunas (não há prova de 44 px em telas estreitas). Feedback de clique, labels de datas/contagens e seleção foram implementados; não são prova de toque, TalkBack, fonte ampliada ou layout no dispositivo. Local, fora da beta.5 publicada. Orçamentos/metas, empréstimos e recorrências ainda exigem revisão monetária integral.
- Exportação Android aprovada: 3.337 módulos, Hermes `entry-12e566feae376f361d9cf0bf8bb9e050.hbc`. Nenhum novo APK/release publicado neste lote.

### Lote local após beta.5 — moeda explícita nos orçamentos

| Antes | Depois | Motivo |
| --- | --- | --- |
| Orçamento sem unidade monetária soma BRL/USD como reais | Cada orçamento registra moeda e considera contas dessa moeda | Evitar limites, percentuais e gastos em unidades incompatíveis |
| Breakdown e limite diário usam R$ independentemente da conta | Lista, home, detalhes e criação usam a moeda do orçamento | Manter unidade do limite, categorias e disponibilidade diária |
| Backup não verifica campo monetário de orçamento | Schema 6 exige coluna currency; backups 3–5 continuam migráveis | Evitar restaurar arquivo que declara schema novo sem a estrutura correspondente |

- Assumido e comunicado: orçamentos antigos permanecem BRL, a unidade em que já eram exibidos; não há câmbio histórico ou inferência de outra intenção. Migração adiciona apenas a coluna com default BRL e o registro de versão, em transação. Limites por categoria, lançamentos e histórico pago são preservados. A exclusão de gastos de outras moedas do cálculo corrige o cálculo anterior, não apaga movimentos. Usuários que pretendiam outro limite monetário devem criar outro orçamento nessa moeda.
- Novo orçamento aceita código de três letras, normalizado; a validação cobre formato, não catálogo ISO/minor units. Armazenamento continua com duas casas decimais. Moeda de orçamento existente é imutável tanto na UI quanto no repositório; omissão na edição preserva a unidade armazenada. Home e detalhes formatam gastos/limites corretamente. Agregações do orçamento rejeitam soma fora do limite inteiro seguro.
- Três testes novos SQLite reproduzem soma BRL/USD indevida e cobrem conta arquivada, pendência excluída, categoria/limite na mesma moeda, moeda inválida, edição sem troca de unidade, migração 5→6 idempotente, preservação de movimentos e limites, backup schema 6 incompleto, falha da migração com rollback da coluna/versão e retry. Fixtures legadas 3/4 foram ajustadas para realmente remover a coluna nova antes do upgrade; não se modificou a regra de empréstimos/recorrências. TypeScript e todos os 162 testes aprovados.
- Backup schema 6 não é compatível com aplicativos antigos que só conhecem schema 5; o app publicado beta.5 não recebe esta mudança até um APK novo. Exportação/compartilhamento/restauração nativa continuam sem prova em dispositivo. Entrada da moeda, edição e layout com valores longos precisam de QA nativo. Mudanças locais; metas e empréstimos ainda exigem moeda/vínculo consistente antes de declarar suporte integral.
- Exportação Android aprovada: 3.337 módulos, Hermes `entry-52dd50b52d203421f5d0f89cb281a020.hbc`. Sem novo APK/release neste lote.

### Escopo atualizado pelo usuário — foco BRL

- Usuário informou que não precisa de USD por enquanto. Expansão monetária em metas/empréstimos foi interrompida antes de editar esses módulos. Proteções e mudanças já testadas foram preservadas, conforme comunicado; não houve rollback de trabalho existente.
- Pendências anteriores de suporte integral a múltiplas moedas não são mais critério de conclusão do escopo atual. A revisão continua das funcionalidades e UI para uso em BRL, com publicação e validação nativa ainda distintas de testes locais.

### Lote local após beta.5 — recorrências com atraso superior a 12 parcelas

| Antes | Depois | Motivo |
| --- | --- | --- |
| Consulta retorna sucesso após somente 12 ocorrências | Geração cobre todas as ocorrências até o horizonte existente | Não deixar calendário/histórico incompletos sem aviso |
| Data inválida da consulta pode produzir resultado vazio | Data/horizonte, valores e referência armazenada são validados | Não tratar entrada inválida ou corrupção como geração válida |
| Avanço de data inválido pode repetir a mesma ocorrência | Próxima data deve ser válida e estritamente posterior | Evitar loop sem avanço e estado incompleto |

- Mantido o horizonte existente de 45 dias futuros, além de todas as parcelas atrasadas. As ocorrências novas permanecem pendentes: geração não liquida despesas, não altera saldo pago nem adivinha pagamentos. Datas mensais continuam ancoradas, inclusive dia 31 e ano bissexto. Registro de instâncias preserva identidade após exclusão; nova consulta não recria parcela removida.
- Transação continua atômica por recorrência (não por catálogo inteiro): falha na 13ª ocorrência desfaz todas as novas parcelas/instâncias daquela regra e sua próxima data; retry recupera. Outra regra já concluída no catálogo não é revertida. Atualização da próxima data ocorre uma vez ao final, reduzindo escritas redundantes; fila existente continua serializando consultas no mesmo objeto SQLite.
- Quatro testes novos reproduziram 12 em vez de 38 parcelas mensais/59 semanais e ausência de rejeição. Agora cobrem atraso completo em uma consulta, relógio local, ano bissexto, retry concorrente sem duplicar, histórico pago/exclusão preservados, falha tardia/rollback/retry, data de consulta impossível e centavos armazenados fracionários. Vinte testes específicos, TypeScript e os 166 testes totais passaram.
- Removido corte silencioso sem impor outro limite arbitrário. Atrasos extremamente grandes ainda podem tornar a consulta demorada no dispositivo; não há benchmark Android ou progresso por parcela. Interface mantém estado de carga enquanto aguarda. Sem nova migração neste lote e sem alterações em moedas/metas/empréstimos. Local, fora da beta.5 publicada.
- Corrigida uma descrição anterior do calendário neste documento: o código já projetava pendências até 45 dias futuros. Isso não é pagamento realizado e não entra no fluxo mensal pago.
- Exportação Android aprovada: 3.337 módulos, Hermes `entry-42f7a5ce200ea2da8d3df2e56f8a4e14.hbc`. ADB consultado neste lote sem dispositivo conectado. Nenhum APK/release novo nem benchmark nativo.
