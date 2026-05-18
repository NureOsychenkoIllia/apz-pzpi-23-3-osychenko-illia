package com.apz.busoptima.ui.screens.tripdetail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.apz.busoptima.data.api.dto.PriceRecommendationDto
import com.apz.busoptima.data.api.dto.TripAnalyticsDto
import com.apz.busoptima.data.api.dto.TripDto
import com.apz.busoptima.ui.util.formatDateTime
import com.apz.busoptima.ui.util.tripStatusColor
import com.apz.busoptima.ui.util.tripStatusLabel
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripDetailScreen(
    tripId: Long,
    onBack: () -> Unit,
    viewModel: TripDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.updateSuccess) {
        if (uiState.updateSuccess != null) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.trip?.route?.let {
                            "${it.originCity} → ${it.destinationCity}"
                        } ?: "Рейс #$tripId"
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }
            uiState.trip != null -> {
                TripDetailContent(
                    trip = uiState.trip!!,
                    analytics = uiState.analytics,
                    priceRecommendation = uiState.priceRecommendation,
                    isPriceLoading = uiState.isPriceLoading,
                    isUpdating = uiState.isUpdating,
                    updateSuccess = uiState.updateSuccess,
                    error = uiState.error,
                    onCalculatePrice = viewModel::calculatePrice,
                    onUpdateStatus = viewModel::updateStatus,
                    modifier = Modifier.padding(padding)
                )
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error ?: "Помилка завантаження")
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = viewModel::loadTrip) { Text("Повторити") }
                    }
                }
            }
        }
    }
}

@Composable
private fun TripDetailContent(
    trip: TripDto,
    analytics: TripAnalyticsDto?,
    priceRecommendation: PriceRecommendationDto?,
    isPriceLoading: Boolean,
    isUpdating: Boolean,
    updateSuccess: String?,
    error: String?,
    onCalculatePrice: () -> Unit,
    onUpdateStatus: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Status + snackbar messages
        if (updateSuccess != null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Text(
                    text = updateSuccess,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
        if (error != null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(
                    text = error,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }

        // Trip info card
        SectionCard(title = "Інформація про рейс") {
            InfoRow("Маршрут", trip.route?.let { "${it.originCity} → ${it.destinationCity}" } ?: "—")
            InfoRow("Відправлення", formatDateTime(trip.scheduledDeparture))
            trip.actualDeparture?.let { InfoRow("Фактичне відправлення", formatDateTime(it)) }
            trip.actualArrival?.let { InfoRow("Прибуття", formatDateTime(it)) }
            InfoRow("Водій", trip.driverName)
            trip.bus?.let { bus ->
                InfoRow("Автобус", "${bus.model} · ${bus.registrationNumber}")
            }
            InfoRow("Статус") {
                Surface(
                    color = tripStatusColor(trip.status).copy(alpha = 0.15f),
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = tripStatusLabel(trip.status),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = tripStatusColor(trip.status),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Passengers card
        SectionCard(title = "Пасажири") {
            val capacity = trip.bus?.capacity ?: 1
            val occupancy = (trip.currentPassengers.toFloat() / capacity * 100).roundToInt()

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "${trip.currentPassengers}",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "з $capacity місць",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$occupancy%",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = occupancyColor(occupancy)
                    )
                    Text("завантаженість", style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { trip.currentPassengers.toFloat() / capacity },
                modifier = Modifier.fillMaxWidth(),
                color = occupancyColor(occupancy)
            )
        }

        // Price recommendation card
        SectionCard(title = "Динамічне ціноутворення") {
            if (trip.route != null) {
                InfoRow("Базова ціна", "₴${trip.route.basePrice}")
            }

            if (priceRecommendation != null) {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(Modifier.height(8.dp))
                InfoRow("Рекомендована ціна") {
                    Text(
                        text = "₴${"%.2f".format(priceRecommendation.recommendedPrice)}",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                val changeSign = if (priceRecommendation.priceChangePercent >= 0) "+" else ""
                InfoRow("Зміна ціни", "$changeSign${"%.1f".format(priceRecommendation.priceChangePercent)}%")
                InfoRow("Коеф. попиту", "%.2f".format(priceRecommendation.demandCoefficient))
                InfoRow("Коеф. часу", "%.2f".format(priceRecommendation.timeCoefficient))
                InfoRow("Коеф. дня", "%.2f".format(priceRecommendation.dayCoefficient))
                Spacer(Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Text(
                        text = priceRecommendation.recommendation,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = onCalculatePrice,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isPriceLoading && trip.route != null && trip.bus != null
            ) {
                if (isPriceLoading) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Icon(Icons.Default.Calculate, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (priceRecommendation == null) "Розрахувати ціну" else "Перерахувати ціну")
                }
            }
        }

        // Analytics card
        if (analytics != null) {
            SectionCard(title = "Аналітика рейсу") {
                InfoRow("Всього пасажирів", "${analytics.totalPassengers}")
                InfoRow("Макс. пасажирів", "${analytics.maxPassengers}")
                InfoRow("Середня завантаженість", "${"%.1f".format(analytics.avgOccupancyRate * 100)}%")
                InfoRow("Виручка", "₴${"%.2f".format(analytics.revenue)}")
                InfoRow("Витрати", "₴${"%.2f".format(analytics.fuelCost + analytics.driverCost + analytics.otherCosts)}")
                InfoRow("Прибуток") {
                    Text(
                        text = "₴${"%.2f".format(analytics.profit)}",
                        fontWeight = FontWeight.SemiBold,
                        color = if (analytics.profit >= 0) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error
                    )
                }
                InfoRow("Рентабельність", "${"%.1f".format(analytics.profitabilityPercent)}%")
            }
        }

        // Status management
        if (trip.status != "completed" && trip.status != "cancelled") {
            SectionCard(title = "Управління статусом") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    when (trip.status) {
                        "scheduled" -> {
                            Button(
                                onClick = { onUpdateStatus("in_progress") },
                                modifier = Modifier.weight(1f),
                                enabled = !isUpdating
                            ) { Text("Розпочати рейс") }
                            OutlinedButton(
                                onClick = { onUpdateStatus("cancelled") },
                                modifier = Modifier.weight(1f),
                                enabled = !isUpdating
                            ) { Text("Скасувати") }
                        }
                        "in_progress" -> {
                            Button(
                                onClick = { onUpdateStatus("completed") },
                                modifier = Modifier.weight(1f),
                                enabled = !isUpdating
                            ) { Text("Завершити рейс") }
                        }
                    }
                }
                if (isUpdating) {
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        Text(value, fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun InfoRow(label: String, valueContent: @Composable () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        valueContent()
    }
}

@Composable
private fun occupancyColor(percent: Int) = when {
    percent >= 85 -> MaterialTheme.colorScheme.error
    percent >= 60 -> MaterialTheme.colorScheme.tertiary
    else -> MaterialTheme.colorScheme.primary
}
