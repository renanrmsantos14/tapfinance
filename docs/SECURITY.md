---
threats_open: 0
scope: delta local apos v1.2.0-beta.4 para v1.2.0-beta.5
scan_id: 55e85e87-73ae-4a06-82cd-4cf296e9cf1e
---

# Revisão de segurança pré-release beta.5

Codex Security concluiu e selou a revisão estática sequencial do delta local: 23 fontes, mais um índice local marcado como não aplicável. Nenhum candidato reportável sobreviveu à revisão. SQL usa parâmetros; gravações financeiras relevantes são exclusivas/atômicas; parser de CSV valida tipo, valores, metadados, limites e pares; cópia não herda identidade bancária nem propriedade de automação.

Este resultado aplica-se ao snapshot `b36a2a1e1b4ca74d163d0279a73ec40a06383b7384dce821aeeb4474670263f1`, base `ffbedd0bc721c9d259f86f63de7bb0b0a201a600`. Depois do scan, a preparação altera versão/configuração de release, documentação, apresentação da mensagem de erro de exportação e comparação semântica de versões. Esses trechos foram revisados diretamente: mensagem de Error local e parser puro com regex ancorada/BigInt, sem novo destino de rede, SQL ou execução de código. A consulta de atualização continua restrita ao endpoint GitHub existente e valida o digest do APK antes de instalar.

Limitações: não é auditoria independente ou integral; nenhum QA em aparelho foi realizado. `npm audit` aponta 14 ocorrências moderadas em dependências transitivas existentes, sem altas/críticas; não houve downgrade automático do Expo. `threats_open: 0` significa zero achados reportáveis no delta revisto, não ausência universal de vulnerabilidades nem resolução dos advisories de dependências.

Artefatos canônicos são gerenciados pelo Codex Security fora do repositório; o ID acima permite rastrear o resultado. Anexos, memória e observações locais não fazem parte da publicação.
