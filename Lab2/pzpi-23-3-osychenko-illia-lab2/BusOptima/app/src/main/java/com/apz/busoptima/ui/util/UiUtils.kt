package com.apz.busoptima.ui.util

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import com.apz.busoptima.R
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

@Composable
fun tripStatusLabel(status: String): String = when (status) {
    "boarding" -> stringResource(R.string.status_boarding)
    "in_progress" -> stringResource(R.string.status_in_progress)
    "scheduled" -> stringResource(R.string.status_scheduled)
    "completed" -> stringResource(R.string.status_completed)
    "cancelled" -> stringResource(R.string.status_cancelled)
    else -> status
}
