package com.apz.busoptima.ui.screens.analytics

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.apz.busoptima.data.api.dto.DashboardDto
import com.apz.busoptima.data.api.dto.ProfitabilityDto
import com.apz.busoptima.data.api.dto.RouteProfitabilityDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(viewModel: AnalyticsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Аналітика") },
            actions = {
                IconButton(onClick = viewModel::loadAll) {
                    Icon(Icons.Default.Refresh, contentDescription = "Оновити")
                }
            }
        )

        when {
            uiState.isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            uiState.error != null && uiState.dashboard == null -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error!!, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = viewModel::loadAll) { Text("Повторити") }
                    }
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    uiState.dashboard?.let { dashboard ->
                        item { DashboardSection(dashboard) }
                    }
                    uiState.profitability?.let { profitability ->
                        item { ProfitabilitySummarySection(profitability) }
                        if (profitability.byRoute.isNotEmpty()) {
                            item {
                                Text(
                                    text = "По маршрутах",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            items(profitability.byRoute) { route ->
                                RouteProfitabilityCard(route)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardSection(dashboard: DashboardDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Поточний стан",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MetricItem("Активних рейсів", "${dashboard.activeTrips}", MaterialTheme.colorScheme.primary)
                MetricItem("Пасажирів", "${dashboard.totalPassengers}", MaterialTheme.colorScheme.secondary)
                MetricItem(
                    "Завантаженість",
                    "${"%.0f".format(dashboard.avgOccupancy * 100)}%",
                    MaterialTheme.colorScheme.tertiary
                )
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Виручка (7 днів)", style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "₴${"%.0f".format(dashboard.totalRevenue)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Прибуток (7 днів)", style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "₴${"%.0f".format(dashboard.totalProfit)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = if (dashboard.totalProfit >= 0) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfitChip(
                    label = "${dashboard.profitableTrips} прибуткових",
                    isProfit = true,
                    modifier = Modifier.weight(1f)
                )
                ProfitChip(
                    label = "${dashboard.unprofitableTrips} збиткових",
                    isProfit = false,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun MetricItem(label: String, value: String, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ProfitChip(label: String, isProfit: Boolean, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        color = (if (isProfit) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.errorContainer),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(8.dp),
            style = MaterialTheme.typography.labelMedium,
            color = if (isProfit) MaterialTheme.colorScheme.onPrimaryContainer
                    else MaterialTheme.colorScheme.onErrorContainer
        )
    }
}

@Composable
private fun ProfitabilitySummarySection(profitability: ProfitabilityDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Прибутковість (30 днів)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.height(12.dp))
            with(profitability.summary) {
                InfoRow("Рейсів", "$totalTrips")
                InfoRow("Пасажирів", "$totalPassengers")
                InfoRow("Виручка", "₴${"%.2f".format(totalRevenue)}")
                InfoRow("Витрати", "₴${"%.2f".format(totalCosts)}")
                InfoRow("Прибуток") {
                    Text(
                        "₴${"%.2f".format(totalProfit)}",
                        fontWeight = FontWeight.Bold,
                        color = if (totalProfit >= 0) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error
                    )
                }
                InfoRow("Середня рентабельність", "${"%.1f".format(averageProfitability)}%")
                InfoRow("Середня завантаженість", "${"%.1f".format(avgOccupancy * 100)}%")
            }
        }
    }
}

@Composable
private fun RouteProfitabilityCard(route: RouteProfitabilityDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = route.routeName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                CategoryChip(route.category)
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoSmall("Рейсів", "${route.tripsCount}")
                InfoSmall("Пасажирів", "${route.totalPassengers}")
                InfoSmall("Завантаженість", "${"%.0f".format(route.avgOccupancy * 100)}%")
                InfoSmall("Рентабельність", "${"%.1f".format(route.profitability)}%")
            }
        }
    }
}

@Composable
private fun CategoryChip(category: String) {
    val (color, label) = when (category) {
        "highly_profitable" -> MaterialTheme.colorScheme.primary to "Висока"
        "profitable" -> MaterialTheme.colorScheme.secondary to "Прибуткова"
        "break_even" -> MaterialTheme.colorScheme.tertiary to "Беззбиткова"
        else -> MaterialTheme.colorScheme.error to "Збиткова"
    }
    Surface(color = color.copy(alpha = 0.15f), shape = MaterialTheme.shapes.small) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium)
        Text(value, fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun InfoRow(label: String, valueContent: @Composable () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium)
        valueContent()
    }
}

@Composable
private fun InfoSmall(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
        Text(label, style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
