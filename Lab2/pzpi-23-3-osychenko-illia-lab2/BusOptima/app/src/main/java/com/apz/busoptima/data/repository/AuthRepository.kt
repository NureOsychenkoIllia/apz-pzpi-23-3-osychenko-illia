package com.apz.busoptima.data.repository

import com.apz.busoptima.data.api.BusOptimaApi
import com.apz.busoptima.data.api.dto.LoginRequest
import com.apz.busoptima.data.api.dto.LoginResponse
import com.apz.busoptima.data.local.TokenDataStore
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult<out T> {
    data class Success<T>(val data: T) : AuthResult<T>()
    data class Error(val message: String) : AuthResult<Nothing>()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: BusOptimaApi,
    private val tokenDataStore: TokenDataStore
) {
    val isLoggedIn = tokenDataStore.isLoggedIn
    val userFullName = tokenDataStore.userFullName
    val userEmail = tokenDataStore.userEmail
    val userRole = tokenDataStore.userRole

    suspend fun login(email: String, password: String): AuthResult<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenDataStore.saveAuthData(
                    accessToken = body.accessToken,
                    refreshToken = body.refreshToken,
                    userId = body.user.id,
                    email = body.user.email,
                    fullName = body.user.fullName,
                    role = body.user.role?.name ?: "user"
                )
                AuthResult.Success(body)
            } else {
                AuthResult.Error("Невірний email або пароль")
            }
        } catch (e: Exception) {
            AuthResult.Error("Помилка з'єднання: ${e.message}")
        }
    }

    suspend fun logout() {
        tokenDataStore.clearAuthData()
    }

    suspend fun getAccessToken(): String? = tokenDataStore.accessToken.first()
}
