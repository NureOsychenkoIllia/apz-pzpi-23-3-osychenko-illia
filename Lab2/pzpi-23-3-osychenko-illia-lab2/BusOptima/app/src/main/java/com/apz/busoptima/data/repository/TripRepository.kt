package com.apz.busoptima.data.repository

import com.apz.busoptima.data.api.BusOptimaApi
import com.apz.busoptima.data.api.dto.TripDto
import com.apz.busoptima.data.api.dto.TripAnalyticsDto
import com.apz.busoptima.data.api.dto.PassengerEventDto
import com.apz.busoptima.data.api.dto.UpdateTripRequest
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}

@Singleton
class TripRepository @Inject constructor(
    private val api: BusOptimaApi
) {
    suspend fun getTrips(status: String? = null): Result<List<TripDto>> {
        return try {
            val response = api.getTrips(status = status)
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Помилка завантаження рейсів: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun getTripById(id: Long): Result<TripDto> {
        return try {
            val response = api.getTripById(id)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Рейс не знайдено")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun updateTripStatus(id: Long, status: String): Result<TripDto> {
        return try {
            val response = api.updateTrip(id, UpdateTripRequest(status = status))
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Помилка оновлення рейсу: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun getTripEvents(id: Long): Result<List<PassengerEventDto>> {
        return try {
            val response = api.getTripEvents(id)
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Помилка завантаження подій: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun getTripAnalytics(id: Long): Result<TripAnalyticsDto> {
        return try {
            val response = api.getTripAnalytics(id)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Аналітика недоступна: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error("Помилка з'єднання: ${e.message}")
        }
    }
}
