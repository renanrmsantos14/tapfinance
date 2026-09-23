package com.tapfinance.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BankNotificationParserTest {
  private val whenPosted = 1_800_000_000_000L

  @Test fun readsCompletedCardPurchase() {
    val parsed = BankNotificationParser.parse("br.com.intermedium", "Compra aprovada", "R$ 1.234,56 no cartão", whenPosted)
    assertEquals("expense", parsed?.type)
    assertEquals(123456L, parsed?.amountCents)
    assertEquals("Compra no cartão", parsed?.description)
  }

  @Test fun acceptsTheSameAmountInTitleAndBody() {
    val parsed = BankNotificationParser.parse("com.c6bank.app", "Compra aprovada R$10,00", "Compra aprovada de R$ 10,00", whenPosted)
    assertEquals(1000L, parsed?.amountCents)
  }

  @Test fun readsPixDirections() {
    val sent = BankNotificationParser.parse("com.c6bank.app", "Pix enviado", "R$ 20,00", whenPosted)
    val received = BankNotificationParser.parse("com.santander.app", "Pix recebido", "R$ 50,99", whenPosted)
    assertEquals("expense", sent?.type)
    assertEquals("income", received?.type)
    assertEquals(5099L, received?.amountCents)
  }

  @Test fun readsInterReceivedPixKeepingOnlySender() {
    val parsed = BankNotificationParser.parse(
      "br.com.intermedium",
      "Pix recebido",
      "Pessoa Exemplo te enviou um Pix de R$ 100,00 creditado na sua conta final ***12345-6.",
      whenPosted,
    )
    assertEquals("income", parsed?.type)
    assertEquals(10000L, parsed?.amountCents)
    assertEquals("Pix de Pessoa Exemplo", parsed?.description)
  }

  @Test fun rejectsAmbiguousAndUntrustedNotifications() {
    assertNull(BankNotificationParser.parse("com.other.bank", "Compra aprovada", "R$ 10,00", whenPosted))
    assertNull(BankNotificationParser.parse("br.com.intermedium", "Pix agendado", "Pix enviado R$ 10,00", whenPosted))
    assertNull(BankNotificationParser.parse("br.com.intermedium", "Compra aprovada", "R$ 10,00, cashback R$ 1,00", whenPosted))
    assertNull(BankNotificationParser.parse("br.com.intermedium", "Compra aprovada", "R$ 10,00 e R$ 20,00", whenPosted))
    assertNull(BankNotificationParser.parse("br.com.intermedium", "Pix enviado e Pix recebido", "R$ 10,00", whenPosted))
  }
}
