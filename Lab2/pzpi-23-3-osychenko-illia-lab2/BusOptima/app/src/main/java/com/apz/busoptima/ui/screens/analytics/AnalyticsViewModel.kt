package com.apz.busoptima.ui.screens.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apz.busoptima.data.api.dto.DashboardDto
import com.apz.busoptima.data.api.dto.ProfitabilityDto
import com.apz.busoptima.data.repository.AnalyticsRepository
import com.apz.busoptima.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AnalyticsUiState(
    val dashboard: DashboardDto? = null,
    val profitability: ProfitabilityDto? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init {
        loadAll()
    }

    fun loadAll() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val dashboardResult = analyticsRepository.getDashboard()
            val profitabilityResult = analyticsRepository.getProfitability()

            val dashboard = (dashboardResult as? Result.Success)?.data
            val profitability = (profitabilityResult as? Result.Success)?.data
            val error = (dashboardResult as? Result.Error)?.message
                ?: (profitabilityResult as? Result.Error)?.message

            _uiState.value = _uiState.value.copy(
                dashboard = dashboard,
                profitability = profitability,
                isLoading = false,
                error = error
            )
        }
    }
}
