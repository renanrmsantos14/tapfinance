package com.tapfinance.assistant

import java.util.Locale

internal data class ParsedBankSuggestion(
  val type: String,
  val amountCents: Long,
  val description: String,
  val occurredAt: Long,
)

internal object BankNotificationParser {
  private val bankPackages = setOf("br.com.intermedium", "com.c6bank.app", "com.santander.app")
  private val amountPattern = Regex("R\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3})*|[0-9]+),([0-9]{2})", RegexOption.IGNORE_CASE)
  private val excluded = Regex("\\b(agendad[oa]s?|pendentes?|cancelad[oa]s?|estornad[oa]s?|negad[oa]s?|recusad[oa]s?|ofertas?|limites?|saldos?|faturas?|cashback|simula[cç][aã]o)\\b")
  private val cardPurchase = Regex("\\bcompra (aprovada|realizada|confirmada)\\b")
  private val pixSent = Regex("\\bpix (enviado|realizado|efetuado|transferido)\\b")
  private val pixReceived = Regex("\\bpix (recebido|creditado)\\b")
  private val receivedSender = Regex("^\\s*([\\p{L}][\\p{L} .'-]{1,69})\\s+te enviou um Pix de R\\$\\s*", RegexOption.IGNORE_CASE)

  fun isSupportedBank(packageName: String): Boolean = packageName in bankPackages

  fun parse(packageName: String, title: String, body: String, postedAt: Long): ParsedBankSuggestion? {
    if (!isSupportedBank(packageName) || postedAt <= 0) return null
    val text = "$title $body".lowercase(Locale.forLanguageTag("pt-BR"))
    if (text.length > 2000 || excluded.containsMatchIn(text)) return null
    val amounts = amountPattern.findAll(text).toList()
    if (amounts.isEmpty() || amounts.map { it.groupValues[1].replace(".", "").trimStart('0') to it.groupValues[2] }.distinct().size != 1) return null
    val match = amounts.first()
    val reais = match.groupValues[1].replace(".", "").toLongOrNull() ?: return null
    if (reais > 99_999_999L) return null
    val cents = reais * 100 + match.groupValues[2].toLong()
    if (cents !in 1..9_999_999_999L) return null

    val purchase = cardPurchase.containsMatchIn(text)
    val sent = pixSent.containsMatchIn(text)
    val received = pixReceived.containsMatchIn(text)
    if (listOf(purchase, sent, received).count { it } != 1) return null
    val type = if (received) "income" else "expense"
    val description = when {
      purchase -> "Compra no cartão"
      received -> receivedSender.find(body)?.groupValues?.get(1)?.trim()?.replace(Regex("\\s+"), " ")?.let { "Pix de $it" } ?: "Pix recebido"
      else -> "Pix enviado"
    }
    return ParsedBankSuggestion(type, cents, description, postedAt)
  }
}
