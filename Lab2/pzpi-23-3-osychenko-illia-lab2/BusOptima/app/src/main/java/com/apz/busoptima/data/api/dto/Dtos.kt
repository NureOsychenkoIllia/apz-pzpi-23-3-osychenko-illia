package com.apz.busoptima.data.api.dto

import com.google.gson.annotations.SerializedName

// ─── Auth ───────────────────────────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String
)

data class RefreshTokenRequest(
    @SerializedName("refresh_token") val refreshToken: String
)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_in") val expiresIn: Int,
    val user: UserDto
)

data class UserDto(
    val id: Long,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("role_id") val roleId: Long,
    val role: RoleDto?,
    @SerializedName("is_active") val isActive: Boolean
)

data class RoleDto(
    val id: Long,
    val name: String,
    val description: String
)

// ─── Route ──────────────────────────────────────────────────────────────────

data class RouteDto(
    val id: Long,
    @SerializedName("origin_city") val originCity: String,
    @SerializedName("destination_city") val destinationCity: String,
    @SerializedName("distance_km") val distanceKm: Double,
    @SerializedName("base_price") val basePrice: Double,
    @SerializedName("estimated_duration_minutes") val estimatedDurationMinutes: Int,
    @SerializedName("is_active") val isActive: Boolean
)

// ─── Bus ────────────────────────────────────────────────────────────────────

data class BusDto(
    val id: Long,
    @SerializedName("registration_number") val registrationNumber: String,
    val capacity: Int,
    val model: String,
    @SerializedName("is_active") val isActive: Boolean
)

// ─── Trip ───────────────────────────────────────────────────────────────────

data class TripDto(
    val id: Long,
    @SerializedName("route_id") val routeId: Long,
    val route: RouteDto?,
    @SerializedName("bus_id") val busId: Long,
    val bus: BusDto?,
    @SerializedName("scheduled_departure") val scheduledDeparture: String,
    @SerializedName("actual_departure") val actualDeparture: String?,
    @SerializedName("actual_arrival") val actualArrival: String?,
    val status: String,
    @SerializedName("current_passengers") val currentPassengers: Int,
    @SerializedName("driver_name") val driverName: String
)

data class UpdateTripRequest(
    val status: String? = null,
    @SerializedName("actual_departure") val actualDeparture: String? = null,
    @SerializedName("actual_arrival") val actualArrival: String? = null
)

// ─── Analytics ──────────────────────────────────────────────────────────────

data class TripAnalyticsDto(
    val id: Long,
    @SerializedName("trip_id") val tripId: Long,
    @SerializedName("total_passengers") val totalPassengers: Int,
    @SerializedName("max_passengers") val maxPassengers: Int,
    @SerializedName("avg_occupancy_rate") val avgOccupancyRate: Double,
    val revenue: Double,
    @SerializedName("fuel_cost") val fuelCost: Double,
    @SerializedName("driver_cost") val driverCost: Double,
    @SerializedName("other_costs") val otherCosts: Double,
    val profit: Double,
    @SerializedName("profitability_percent") val profitabilityPercent: Double
)

data class DashboardDto(
    @SerializedName("active_trips") val activeTrips: Int,
    @SerializedName("total_passengers") val totalPassengers: Int,
    @SerializedName("total_revenue") val totalRevenue: Double,
    @SerializedName("total_profit") val totalProfit: Double,
    @SerializedName("avg_occupancy") val avgOccupancy: Double,
    @SerializedName("avg_profitability") val avgProfitability: Double,
    @SerializedName("profitable_trips") val profitableTrips: Int,
    @SerializedName("unprofitable_trips") val unprofitableTrips: Int,
    @SerializedName("trips_by_category") val tripsByCategory: Map<String, Int>
)

data class ProfitabilityDto(
    val period: PeriodDto,
    val summary: ProfitabilitySummaryDto,
    @SerializedName("by_route") val byRoute: List<RouteProfitabilityDto>
)

data class PeriodDto(val from: String, val to: String)

data class ProfitabilitySummaryDto(
    @SerializedName("total_trips") val totalTrips: Int,
    @SerializedName("total_passengers") val totalPassengers: Int,
    @SerializedName("total_revenue") val totalRevenue: Double,
    @SerializedName("total_costs") val totalCosts: Double,
    @SerializedName("total_profit") val totalProfit: Double,
    @SerializedName("average_profitability") val averageProfitability: Double,
    @SerializedName("avg_occupancy") val avgOccupancy: Double
)

data class RouteProfitabilityDto(
    @SerializedName("route_id") val routeId: Long,
    @SerializedName("route_name") val routeName: String,
    @SerializedName("trips_count") val tripsCount: Int,
    @SerializedName("total_passengers") val totalPassengers: Int,
    @SerializedName("avg_occupancy") val avgOccupancy: Double,
    val revenue: Double,
    val costs: Double,
    val profit: Double,
    val profitability: Double,
    val category: String
)

// ─── Pricing ─────────────────────────────────────────────────────────────────

data class PriceCalculationRequest(
    @SerializedName("base_price") val basePrice: Double,
    @SerializedName("current_passengers") val currentPassengers: Int,
    val capacity: Int,
    @SerializedName("departure_time") val departureTime: String
)

data class PriceRecommendationDto(
    @SerializedName("base_price") val basePrice: Double,
    @SerializedName("recommended_price") val recommendedPrice: Double,
    @SerializedName("occupancy_rate") val occupancyRate: Double,
    @SerializedName("demand_coefficient") val demandCoefficient: Double,
    @SerializedName("time_coefficient") val timeCoefficient: Double,
    @SerializedName("day_coefficient") val dayCoefficient: Double,
    @SerializedName("price_change") val priceChange: Double,
    @SerializedName("price_change_percent") val priceChangePercent: Double,
    val category: String,
    val recommendation: String
)

// ─── Passenger Events ────────────────────────────────────────────────────────

data class PassengerEventDto(
    val id: Long,
    @SerializedName("trip_id") val tripId: Long,
    @SerializedName("event_type") val eventType: String,
    val timestamp: String,
    val latitude: Double?,
    val longitude: Double?,
    @SerializedName("passenger_count_after") val passengerCountAfter: Int,
    @SerializedName("is_synced") val isSynced: Boolean
)
