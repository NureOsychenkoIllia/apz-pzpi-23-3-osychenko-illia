package com.apz.busoptima.ui.screens.tripdetail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apz.busoptima.data.api.dto.PriceRecommendationDto
import com.apz.busoptima.data.api.dto.TripAnalyticsDto
import com.apz.busoptima.data.api.dto.TripDto
import com.apz.busoptima.data.repository.PricingRepository
import com.apz.busoptima.data.repository.Result
import com.apz.busoptima.data.repository.TripRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class TripDetailUiState(
    val trip: TripDto? = null,
    val analytics: TripAnalyticsDto? = null,
    val priceRecommendation: PriceRecommendationDto? = null,
    val isLoading: Boolean = false,
    val isUpdating: Boolean = false,
    val isPriceLoading: Boolean = false,
    val error: String? = null,
    val updateSuccess: String? = null
)

@HiltViewModel
class TripDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val tripRepository: TripRepository,
    private val pricingRepository: PricingRepository
) : ViewModel() {

    private val tripId: Long = checkNotNull(savedStateHandle["tripId"])

    private val _uiState = MutableStateFlow(TripDetailUiState())
    val uiState: StateFlow<TripDetailUiState> = _uiState.asStateFlow()

    init {
        loadTrip()
    }

    fun loadTrip() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = tripRepository.getTripById(tripId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(trip = result.data, isLoading = false)
                    loadAnalytics()
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is Result.Loading -> {}
            }
        }
    }

    private fun loadAnalytics() {
        viewModelScope.launch {
            when (val result = tripRepository.getTripAnalytics(tripId)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(analytics = result.data)
                }
                else -> {}
            }
        }
    }

    fun calculatePrice() {
        val trip = _uiState.value.trip ?: return
        val route = trip.route ?: return
        val bus = trip.bus ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPriceLoading = true)
            val departureTime = try {
                Instant.parse(trip.scheduledDeparture)
                    .atOffset(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            } catch (e: Exception) {
                trip.scheduledDeparture
            }
            when (val result = pricingRepository.calculatePrice(
                basePrice = route.basePrice,
                currentPassengers = trip.currentPassengers,
                capacity = bus.capacity,
                departureTime = departureTime
            )) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        priceRecommendation = result.data,
                        isPriceLoading = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isPriceLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun updateStatus(newStatus: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true)
            when (val result = tripRepository.updateTripStatus(tripId, newStatus)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        trip = result.data,
                        isUpdating = false,
                        updateSuccess = "Статус оновлено"
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isUpdating = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, updateSuccess = null)
    }
}
