# CLEAN — primeiro lote local

Direção confirmada pelo usuário: minimalismo com liberdade visual além do Cashew, preservando funções e dados. Contexto registrado em `PRODUCT.md`.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Banner azul redundante e dez tiles em Mais | Dez ações em lista com separadores discretos | Reduzir decoração sem esconder funções |
| Claro terroso e escuro azul saturado | Superfícies neutras e seleção discreta | Dar prioridade a valores e estados |
| Conteúdo aparece em cascata após consulta de acessibilidade | Conteúdo visível imediatamente | Evitar espera visual e conteúdo invisível se a consulta falhar |
| Quatro itens de navegação com largura mínima total de 352 dp | Colunas flexíveis, labels de 12 sp e alvos de 52 dp | Adaptar a barra a telas estreitas |
| Detalhes sem seção ativa | Seleção da seção pai nos detalhes | Manter orientação |
| Histórico sem opções arquivadas | Catálogo completo apenas no filtro histórico | Preservar consulta sem habilitar arquivados em novos lançamentos |
| Relatório mostra somente o nome do mês | Mês e ano | Diferenciar períodos de anos distintos |

Feedback de toque permanece. A consulta de reduzir movimentos trata falha, desmontagem e atualização durante a consulta. O seletor de versões não anima quando a preferência está ativada ou ainda é desconhecida. Não houve migração, alteração de versão, dependência nova ou publicação.

Verificação: TypeScript, 170 testes e exportação Android passaram (3.339 módulos; bundle Hermes `entry-c14bcdf1b5d4a621025b25bcd89db705.hbc`). Dois testes exercitam SQLite real para catálogo arquivado e recuperação de erro; outros cobrem mês/ano e seção de navegação. Testes de lógica e exportação não comprovam aparência, foco, TalkBack, teclado, escala de fonte ou toque nativo.

Limites: ADB sem dispositivo conectado; `react-native-web` não está instalado. Não instalar dependências apenas para simular aprovação visual. Validação visual e interativa no Android permanece pendente. Exportação Android é uma camada separada, não validação no dispositivo.

O redesign integral ainda não está concluído. Próximos pontos: hierarquia e densidade de Início/Orçamentos/Ajustes/formulários, pequenos controles restantes, valores longos, texto ampliado, organização de Mais por grupos, estados de erro e teste nativo de navegação/entrada/atualização. A beta.6 publicada não inclui este lote.

## Segundo lote — telas principais e leitura

| Antes | Depois | Motivo |
| --- | --- | --- |
| Contas em carrossel antes do saldo e logo decorativo | Saldo primeiro, contas em linhas com tipo em português | Priorizar consulta e reduzir chrome |
| Resumos de metas/orçamentos/empréstimos em cards | Linhas discretas, barras finas e feedback de toque | Menos blocos sem perder tarefas |
| Percentuais usam cores arbitrárias do cadastro | Texto usa a paleta; cor escolhida permanece nas barras | Não comprometer a leitura com uma cor clara |
| Barra de orçamento mostra ao menos 1% mesmo sem gastos | Zero gasto tem preenchimento zero | Não inventar progresso visual |
| Editar/arquivar orçamento são textos com alvo pequeno | QuietButton de 48 dp e ações explícitas | Toque previsível sem depender do long press |
| Formulário tem chips de 36 dp e campos de 34 dp | Opções, fechar e limites com mínimo de 48 dp | Melhorar uso por toque e texto ampliado |
| Botão de atualizações tem branco fixo | Foreground `accentContrast` por tema | Corrigir contraste no tema escuro |
| Ícone/spinner dentro do Text do botão primário | Ícone/spinner e label como filhos separados | Respeitar composição de componentes nativos |
| Valor do lançamento disputa largura com descrição | Valor na área de conteúdo, sem truncamento forçado | Dar espaço a nomes e valores longos |
| Mais é uma lista única | Organização, Acompanhamento e Preferências | Agrupar os mesmos dez destinos |

Também removidos rótulos redundantes de cabeçalho, bordas externas dos grupos em Ajustes e do histórico. Cabeçalhos de seção permitem quebra; métricas não reduzem automaticamente o tamanho do texto para caber. Resumos do histórico podem quebrar em linhas. Ações de dados desabilitadas têm estado anunciado e visual. Não houve alteração de schema, dados, importação/exportação, notificações, versionamento ou release.

Verificação final deste lote: TypeScript, 172 testes e exportação Android de 3.340 módulos aprovados; Hermes `entry-7e9b98b7219a9a492a1880964d8c5004.hbc`. Os dois testes novos calculam contraste de dez pares da paleta em cada tema (mínimo 4,5:1); não cobrem automaticamente cada combinação ou estado da UI. Diff sem erro de whitespace.

Ambiente consultado: sem AVD instalado; sem suporte web instalado. Portanto, nenhum clique, teclado, TalkBack ou screenshot nativo foi validado neste lote. As mudanças de layout e composição precisam desse teste; exportação não o substitui.

O escopo integral permanece aberto: revisar `quick-entry`, `transaction/[id]`, `collection/[kind]`, `tracker/[kind]/[id]`, `budget/[id]`, transferência, correção de saldo, calendário, relatórios, atividade e seletor de versões; completar feedback/labels do histórico; padronizar os dois modais restantes com reduzir movimentos; conferir todas as telas com dados reais, nomes/valores longos e escala de fonte, navegação e teclado no Android. Estas pendências atualizam a lista do primeiro lote, não reduzem o objetivo de revisar toda a UI/UX/animação.

## Terceiro lote — formulários e movimento

| Antes | Depois | Motivo |
| --- | --- | --- |
| Cabeçalhos centrados com espaçadores vazios em quatro fluxos | FormHeader compartilhado, título legível e voltar de 48 dp | Hierarquia consistente sem containers decorativos |
| Conta e vínculos antes do valor no lançamento rápido | Tipo/valor primeiro; conta/categoria depois; vínculos opcionais abaixo | Priorizar a tarefa de entrada |
| Painéis grandes em valor/transferência/detalhe especial | Valor direto na página, com foco visível no input | Reduzir decoração mantendo orientação |
| Conta/categoria/valor editáveis durante gravação | Estado disabled, feedback visual e edição bloqueada nos fluxos alterados | Evitar mudanças aparentes durante uma operação já iniciada |
| Conta truncada e seletores pequenos | Nomes com quebra e controles com mínimo de 48 dp | Melhorar leitura e alcance por toque |
| Data/hora sempre lado a lado | Layout permite quebra, campos com altura mínima e padding | Suportar menos espaço disponível |
| Alguns modais usam fade ao reduzir movimentos | Todos os quatro modais usam none quando true ou desconhecido | Uniformizar a preferência conservadora |

FormHeader reutilizado em novo/editar/duplicar lançamento, detalhes de transferências/correções, transferência e correção de saldo. QuietButton agora aceita disabled. CurrencyInput mantém a digitação por centavos, anuncia o bloqueio, ignora eventos enquanto desabilitado e sai do foco nesse estado; reabilitar não força novo foco. Seletores de situação e vínculo continuam usando os mesmos valores técnicos. O seletor opcional existente substitui código duplicado de vínculo no lançamento rápido, distingue Meta/Empréstimo e só aparece após a consulta das referências.

Alterações pontuais em cadastros, trackers e orçamento neste lote: bloquear CurrencyInput/AccountSelector durante salvar e respeitar reduzir movimentos no modal. Isso não equivale à revisão integral dessas telas. Não foram alterados serviços, regras financeiras, schema ou registros. Confirmações de excluir/transferir/corrigir saldo e regras de referência permanecem.

TypeScript, os 172 testes de regressão e exportação Android de 3.340 módulos passaram; Hermes `entry-985f70907bc92ef023668e6f62c8681d.hbc`. Não foram criados testes estáticos de fonte para simular prova de interação. ADB consultado novamente sem dispositivo; foco, teclado, toque, leitura por TalkBack e aparência continuam sem validação nativa. Ainda faltam acabamento dos cadastros/trackers/detalhe do orçamento, calendário, relatórios, atividade, seletor de versões, feedback completo dos filtros e estados restantes, além da inspeção de todas as telas no Android. Objetivo integral continua aberto; sem novo APK/release.
