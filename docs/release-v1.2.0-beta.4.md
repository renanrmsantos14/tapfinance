# TapFinance 1.2.0-beta.4

Pré-release de integridade e recuperação dos formulários. Android versionCode 18; esquema do banco permanece 5.

## Alterações

- Criação e edição validam valores, datas, tipo, situação e referências diretamente no repositório SQLite, atomicamente. Novos vínculos inexistentes ou arquivados são rejeitados sem gravações parciais.
- Conta omitida usa a conta principal ativa atual, sem depender de um ID fixo. Sugestões bancárias repetidas permanecem idempotentes mesmo após arquivar a conta original.
- Edição histórica preserva conta e categoria originais arquivadas, identificadas na seleção, sem disponibilizá-las para novos lançamentos.
- Formulários mostram carregamento, falha com nova tentativa e ausência de cadastros. Retorno do gerenciamento atualiza as referências; respostas antigas são descartadas.
- Pré-preenchimento tardio de metas/empréstimos preserva valor, descrição e tipo já editados. Vínculo indisponível exige escolha explícita; nenhum vínculo é adivinhado.
- Seletores têm feedback de toque e rótulos acessíveis; categoria respeita redução de movimento. Salvamento aguarda referências válidas, e exclusão indica estado ocupado.

## Validação e limites

- 89 testes automatizados passaram, sem falhas; TypeScript aprovado. Verificação de bundle e APK registrada após a compilação.
- Faça backup antes de atualizar. Esquema 5 não suporta downgrade para aplicativos antigos.
- APK de avaliação mantém a chave debug existente; não é uma assinatura de produção para Play Store.
- Sem dispositivo/emulador disponível: aparência, teclado, leitor de tela, navegação, restauração real, Assistente e notificações continuam pendentes de QA nativo.
- Revisão integral e paridade completa com o Cashew permanecem abertas. Esta versão não é declarada estável nem uma cópia integral concluída.
