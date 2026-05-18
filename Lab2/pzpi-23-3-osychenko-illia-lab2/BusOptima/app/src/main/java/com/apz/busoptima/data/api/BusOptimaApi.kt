package com.apz.busoptima.data.api

import com.apz.busoptima.data.api.dto.*
import retrofit2.Response
import retrofit2.http.*

interface BusOptimaApi {

    // ─── Auth ──────────────────────────────────────────────────────────────

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<LoginResponse>

    // ─── Trips ─────────────────────────────────────────────────────────────

    @GET("trips")
    suspend fun getTrips(
        @Query("status") status: String? = null,
        @Query("date_from") dateFrom: String? = null,
        @Query("date_to") dateTo: String? = null
    ): Response<List<TripDto>>

    @GET("trips/{id}")
    suspend fun getTripById(@Path("id") id: Long): Response<TripDto>

    @PUT("trips/{id}")
    suspend fun updateTrip(
        @Path("id") id: Long,
        @Body request: UpdateTripRequest
    ): Response<TripDto>

    @GET("trips/{id}/events")
    suspend fun getTripEvents(@Path("id") id: Long): Response<List<PassengerEventDto>>

    @GET("trips/{id}/analytics")
    suspend fun getTripAnalytics(@Path("id") id: Long): Response<TripAnalyticsDto>

    // ─── Routes ────────────────────────────────────────────────────────────

    @GET("routes")
    suspend fun getRoutes(@Query("active_only") activeOnly: Boolean = true): Response<List<RouteDto>>

    // ─── Analytics ─────────────────────────────────────────────────────────

    @GET("analytics/dashboard")
    suspend fun getDashboard(): Response<DashboardDto>

    @GET("analytics/profitability")
    suspend fun getProfitability(
        @Query("date_from") dateFrom: String? = null,
        @Query("date_to") dateTo: String? = null,
        @Query("route_id") routeId: Long? = null
    ): Response<ProfitabilityDto>

    // ─── Pricing ───────────────────────────────────────────────────────────

    @POST("pricing/calculate")
    suspend fun calculatePrice(@Body request: PriceCalculationRequest): Response<PriceRecommendationDto>
}
