package com.apz.busoptima.data.repository

import com.apz.busoptima.data.api.BusOptimaApi
import com.apz.busoptima.data.api.dto.DashboardDto
import com.apz.busoptima.data.api.dto.ProfitabilityDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnalyticsRepository @Inject constructor(
    private val api: BusOptimaApi
) {
    suspend fun getDashboard(): Result<DashboardDto> {
        return try {
            val response = api.getDashboard()
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Помилка завантаження дашборду: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun getProfitability(
        dateFrom: String? = null,
        dateTo: String? = null,
        routeId: Long? = null
    ): Result<ProfitabilityDto> {
        return try {
            val response = api.getProfitability(dateFrom, dateTo, routeId)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Помилка завантаження прибутковості: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }
}
