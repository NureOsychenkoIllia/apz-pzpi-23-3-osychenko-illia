package com.apz.busoptima.ui.util

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun formatDateTime(isoString: String): String {
    return try {
        val instant = Instant.parse(isoString)
        val formatter = DateTimeFormatter.ofPattern("dd.MM HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(instant)
    } catch (e: Exception) {
        isoString.take(16).replace("T", " ")
    }
}

@Composable
fun tripStatusColor(status: String): Color = when (status) {
    "boarding" -> Color(0xFF2E7D32)
    "in_progress" -> Color(0xFF2E7D32)
    "scheduled" -> MaterialTheme.colorScheme.primary
    "completed" -> MaterialTheme.colorScheme.secondary
    "cancelled" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

fun tripStatusLabel(status: String): String = when (status) {
    "boarding" -> "Посадка"
    "in_progress" -> "В дорозі"
    "scheduled" -> "Заплановано"
    "completed" -> "Завершено"
    "cancelled" -> "Скасовано"
    else -> status
}
