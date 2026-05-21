package com.apz.busoptima.ui.screens.trips

import androidx.annotation.StringRes
import com.apz.busoptima.R
import com.apz.busoptima.app.AppResumeCoordinator
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apz.busoptima.data.api.dto.TripDto
import com.apz.busoptima.data.repository.Result
import com.apz.busoptima.data.repository.TripRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class TripFilter(@StringRes val labelRes: Int, val statusParam: String?) {
    ALL(R.string.filter_all, null),
    ACTIVE(R.string.filter_active, "in_progress"),
    SCHEDULED(R.string.filter_scheduled, "scheduled"),
    COMPLETED(R.string.filter_completed, "completed")
}

data class TripsUiState(
    val trips: List<TripDto> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedFilter: TripFilter = TripFilter.ALL
)

@HiltViewModel
class TripsViewModel @Inject constructor(
    private val tripRepository: TripRepository,
    private val appResumeCoordinator: AppResumeCoordinator
) : ViewModel() {

    private val _uiState = MutableStateFlow(TripsUiState())
    val uiState: StateFlow<TripsUiState> = _uiState.asStateFlow()

    init {
        loadTrips()
        viewModelScope.launch {
            appResumeCoordinator.appResumed.collect {
                loadTrips()
            }
        }
    }

    fun loadTrips() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val status = _uiState.value.selectedFilter.statusParam
            when (val result = tripRepository.getTrips(status = status)) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        trips = result.data,
                        isLoading = false
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun setFilter(filter: TripFilter) {
        _uiState.value = _uiState.value.copy(selectedFilter = filter)
        loadTrips()
    }
}
