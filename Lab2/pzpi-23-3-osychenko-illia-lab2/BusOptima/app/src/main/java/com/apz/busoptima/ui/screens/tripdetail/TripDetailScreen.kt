package com.apz.busoptima.ui.screens.tripdetail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.apz.busoptima.R
import com.apz.busoptima.data.api.dto.PassengerEventDto
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
    isDriver: Boolean = false,
    onBack: () -> Unit,
    viewModel: TripDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

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
                        } ?: stringResource(R.string.trip_detail_title_fallback, tripId)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back)
                        )
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }
            }
            uiState.trip != null -> {
                TripDetailContent(
                    trip = uiState.trip!!,
                    isDriver = isDriver,
                    analytics = uiState.analytics,
                    events = uiState.events,
                    priceRecommendation = uiState.priceRecommendation,
                    manualPassengerCount = uiState.manualPassengerCount,
                    isEventsLoading = uiState.isEventsLoading,
                    isPriceLoading = uiState.isPriceLoading,
                    isUpdating = uiState.isUpdating,
                    updateSuccess = uiState.updateSuccess,
                    error = uiState.error,
                    onCalculatePrice = viewModel::calculatePrice,
                    onAdjustPassengerCount = viewModel::adjustPassengerCount,
                    onUpdateStatus = viewModel::updateStatus,
                    modifier = Modifier.padding(padding)
                )
            }
            else -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error ?: stringResource(R.string.trip_detail_load_error))
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = viewModel::loadTrip) {
                            Text(stringResource(R.string.action_retry))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TripDetailContent(
    trip: TripDto,
    isDriver: Boolean,
    analytics: TripAnalyticsDto?,
    events: List<PassengerEventDto>,
    priceRecommendation: PriceRecommendationDto?,
    manualPassengerCount: Int?,
    isEventsLoading: Boolean,
    isPriceLoading: Boolean,
    isUpdating: Boolean,
    updateSuccess: String?,
    error: String?,
    onCalculatePrice: () -> Unit,
    onAdjustPassengerCount: (Int) -> Unit,
    onUpdateStatus: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val displayedPassengerCount = manualPassengerCount ?: trip.currentPassengers

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
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

        SectionCard(title = stringResource(R.string.section_trip_info)) {
            InfoRow(stringResource(R.string.label_route),
                trip.route?.let { "${it.originCity} → ${it.destinationCity}" } ?: "—")
            InfoRow(stringResource(R.string.label_departure), formatDateTime(trip.scheduledDeparture))
            trip.actualDeparture?.let {
                InfoRow(stringResource(R.string.label_actual_departure), formatDateTime(it))
            }
            trip.actualArrival?.let {
                InfoRow(stringResource(R.string.label_arrival), formatDateTime(it))
            }
            InfoRow(stringResource(R.string.label_driver), trip.driverName)
            trip.bus?.let { bus ->
                InfoRow(stringResource(R.string.label_bus), "${bus.model} · ${bus.registrationNumber}")
            }
            InfoRow(stringResource(R.string.label_status)) {
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

        SectionCard(title = stringResource(R.string.section_passengers)) {
            val capacity = trip.bus?.capacity ?: 1
            val occupancy = (displayedPassengerCount.toFloat() / capacity * 100).roundToInt()

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "$displayedPassengerCount",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = stringResource(R.string.passengers_of_seats, capacity),
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
                    Text(stringResource(R.string.passengers_occupancy), style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { displayedPassengerCount.toFloat() / capacity },
                modifier = Modifier.fillMaxWidth(),
                color = occupancyColor(occupancy)
            )
        }

        if (isDriver) {
            DriverActionCard(
                trip = trip,
                displayedPassengerCount = displayedPassengerCount,
                priceRecommendation = priceRecommendation,
                isPriceLoading = isPriceLoading,
                onCalculatePrice = onCalculatePrice,
                onAdjustPassengerCount = onAdjustPassengerCount
            )
        }

        SectionCard(title = stringResource(R.string.section_pricing)) {
            if (trip.route != null) {
                InfoRow(stringResource(R.string.label_base_price), "₴${trip.route.basePrice}")
            }

            if (priceRecommendation != null) {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(Modifier.height(8.dp))
                InfoRow(stringResource(R.string.label_recommended_price)) {
                    Text(
                        text = "₴${"%.2f".format(priceRecommendation.recommendedPrice)}",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                val changeSign = if (priceRecommendation.priceChangePercent >= 0) "+" else ""
                InfoRow(stringResource(R.string.label_price_change),
                    "$changeSign${"%.1f".format(priceRecommendation.priceChangePercent)}%")
                InfoRow(stringResource(R.string.label_demand_coef),
                    "%.2f".format(priceRecommendation.demandCoefficient))
                InfoRow(stringResource(R.string.label_time_coef),
                    "%.2f".format(priceRecommendation.timeCoefficient))
                InfoRow(stringResource(R.string.label_day_coef),
                    "%.2f".format(priceRecommendation.dayCoefficient))
                Spacer(Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer)
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
                    Text(stringResource(
                        if (priceRecommendation == null) R.string.button_calculate_price
                        else R.string.button_recalculate_price
                    ))
                }
            }
        }

        if (isDriver) {
            SectionCard(title = stringResource(R.string.section_event_log)) {
                when {
                    isEventsLoading -> {
                        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                    }
                    events.isEmpty() -> {
                        Text(
                            text = stringResource(R.string.events_empty),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    else -> {
                        events.take(5).forEach { event ->
                            EventRow(event = event)
                        }
                    }
                }
            }
        }

        if (!isDriver && analytics != null) {
            SectionCard(title = stringResource(R.string.section_trip_analytics)) {
                InfoRow(stringResource(R.string.label_total_passengers), "${analytics.totalPassengers}")
                InfoRow(stringResource(R.string.label_max_passengers), "${analytics.maxPassengers}")
                InfoRow(stringResource(R.string.label_avg_occupancy),
                    "${"%.1f".format(analytics.avgOccupancyRate * 100)}%")
                InfoRow(stringResource(R.string.label_revenue), "₴${"%.2f".format(analytics.revenue)}")
                InfoRow(stringResource(R.string.label_costs),
                    "₴${"%.2f".format(analytics.fuelCost + analytics.driverCost + analytics.otherCosts)}")
                InfoRow(stringResource(R.string.label_profit)) {
                    Text(
                        text = "₴${"%.2f".format(analytics.profit)}",
                        fontWeight = FontWeight.SemiBold,
                        color = if (analytics.profit >= 0) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error
                    )
                }
                InfoRow(stringResource(R.string.label_profitability),
                    "${"%.1f".format(analytics.profitabilityPercent)}%")
            }
        }

        if (trip.status != "completed" && trip.status != "cancelled") {
            SectionCard(title = stringResource(R.string.section_status_management)) {
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
                            ) { Text(stringResource(R.string.button_start_trip)) }
                            OutlinedButton(
                                onClick = { onUpdateStatus("cancelled") },
                                modifier = Modifier.weight(1f),
                                enabled = !isUpdating
                            ) { Text(stringResource(R.string.button_cancel_trip)) }
                        }
                        "in_progress" -> {
                            Button(
                                onClick = { onUpdateStatus("completed") },
                                modifier = Modifier.weight(1f),
                                enabled = !isUpdating
                            ) { Text(stringResource(R.string.button_complete_trip)) }
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
private fun DriverActionCard(
    trip: TripDto,
    displayedPassengerCount: Int,
    priceRecommendation: PriceRecommendationDto?,
    isPriceLoading: Boolean,
    onCalculatePrice: () -> Unit,
    onAdjustPassengerCount: (Int) -> Unit
) {
    SectionCard(title = stringResource(R.string.section_driver_panel)) {
        Text(
            text = stringResource(R.string.driver_current_trip_label),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = trip.route?.let { "${it.originCity} → ${it.destinationCity}" }
                ?: stringResource(R.string.trip_detail_title_fallback, trip.id),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = stringResource(R.string.driver_manual_counter_label),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedButton(
                onClick = { onAdjustPassengerCount(-1) },
                modifier = Modifier.weight(1f)
            ) {
                Text("-1")
            }
            Text(
                text = "$displayedPassengerCount",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            OutlinedButton(
                onClick = { onAdjustPassengerCount(1) },
                modifier = Modifier.weight(1f)
            ) {
                Text("+1")
            }
        }
        Spacer(Modifier.height(12.dp))
        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            shape = MaterialTheme.shapes.medium
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Sell, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.driver_price_label),
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = if (priceRecommendation != null) {
                                "₴${"%.2f".format(priceRecommendation.recommendedPrice)}"
                            } else {
                                "₴${trip.route?.basePrice ?: 0.0}"
                            },
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Button(onClick = onCalculatePrice, enabled = !isPriceLoading && trip.route != null && trip.bus != null) {
                    Text(stringResource(R.string.action_refresh))
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.driver_manual_note),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun EventRow(event: PassengerEventDto) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (event.eventType == "entry") {
                    stringResource(R.string.event_entry)
                } else {
                    stringResource(R.string.event_exit)
                },
                fontWeight = FontWeight.Medium
            )
            Text(
                text = stringResource(R.string.event_passenger_count, event.passengerCountAfter),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
        Text(
            text = formatDateTime(event.timestamp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
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
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
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
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium)
        valueContent()
    }
}

@Composable
private fun occupancyColor(percent: Int) = when {
    percent >= 85 -> MaterialTheme.colorScheme.error
    percent >= 60 -> MaterialTheme.colorScheme.tertiary
    else -> MaterialTheme.colorScheme.primary
}
