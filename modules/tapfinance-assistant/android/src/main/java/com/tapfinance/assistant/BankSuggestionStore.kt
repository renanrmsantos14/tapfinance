package com.tapfinance.assistant

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

internal object BankSuggestionStore {
  private const val PREFS = "bank_suggestions"
  private const val ITEMS = "items"
  private const val RETENTION_MS = 7L * 24 * 60 * 60 * 1000

  @Synchronized
  fun add(context: Context, source: String, parsed: ParsedBankSuggestion): String? {
    val items = read(context).toMutableList()
    val fingerprint = sha256(source)
    if (items.any { it.optString("fingerprint") == fingerprint }) {
      write(context, items)
      return null
    }
    val id = UUID.randomUUID().toString()
    items.add(JSONObject().apply {
      put("id", id)
      put("fingerprint", fingerprint)
      put("handled", false)
      put("type", parsed.type)
      put("amountCents", parsed.amountCents)
      put("description", parsed.description)
      put("occurredAt", parsed.occurredAt)
    })
    write(context, items)
    return id
  }

  @Synchronized
  fun get(context: Context, id: String): Map<String, Any>? {
    val items = read(context)
    write(context, items)
    val item = items.firstOrNull { it.optString("id") == id && !it.optBoolean("handled") } ?: return null
    return mapOf(
      "id" to id,
      "type" to item.getString("type"),
      "amountCents" to item.getLong("amountCents"),
      "description" to item.getString("description"),
      "occurredAt" to item.getLong("occurredAt"),
    )
  }

  @Synchronized
  fun markHandled(context: Context, id: String) {
    val items = read(context)
    items.firstOrNull { it.optString("id") == id }?.apply {
      put("handled", true)
      remove("type")
      remove("amountCents")
      remove("description")
    }
    write(context, items)
  }

  @Synchronized
  fun discard(context: Context, id: String) {
    write(context, read(context).filterNot { it.optString("id") == id })
  }

  private fun read(context: Context): List<JSONObject> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ITEMS, "[]") ?: "[]"
    val array = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    val cutoff = System.currentTimeMillis() - RETENTION_MS
    return (0 until array.length()).mapNotNull { array.optJSONObject(it) }
      .filter { it.optLong("occurredAt") >= cutoff }
      .takeLast(100)
  }

  private fun write(context: Context, items: List<JSONObject>) {
    val array = JSONArray()
    items.forEach(array::put)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(ITEMS, array.toString()).commit()
  }

  private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}
