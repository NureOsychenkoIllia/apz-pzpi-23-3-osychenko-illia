package com.apz.busoptima.data.repository

import com.apz.busoptima.data.api.BusOptimaApi
import com.apz.busoptima.data.api.dto.PriceCalculationRequest
import com.apz.busoptima.data.api.dto.PriceRecommendationDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PricingRepository @Inject constructor(
    private val api: BusOptimaApi
) {
    suspend fun calculatePrice(
        basePrice: Double,
        currentPassengers: Int,
        capacity: Int,
        departureTime: String
    ): Result<PriceRecommendationDto> {
        return try {
            val response = api.calculatePrice(
                PriceCalculationRequest(basePrice, currentPassengers, capacity, departureTime)
            )
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Помилка розрахунку ціни: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }
}
