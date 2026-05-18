package com.apz.busoptima.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val USER_ID = longPreferencesKey("user_id")
        private val USER_EMAIL = stringPreferencesKey("user_email")
        private val USER_FULL_NAME = stringPreferencesKey("user_full_name")
        private val USER_ROLE = stringPreferencesKey("user_role")
    }

    val accessToken: Flow<String?> = context.dataStore.data.map { it[ACCESS_TOKEN] }
    val refreshToken: Flow<String?> = context.dataStore.data.map { it[REFRESH_TOKEN] }
    val userId: Flow<Long?> = context.dataStore.data.map { it[USER_ID] }
    val userEmail: Flow<String?> = context.dataStore.data.map { it[USER_EMAIL] }
    val userFullName: Flow<String?> = context.dataStore.data.map { it[USER_FULL_NAME] }
    val userRole: Flow<String?> = context.dataStore.data.map { it[USER_ROLE] }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map {
        it[ACCESS_TOKEN]?.isNotEmpty() == true
    }

    suspend fun saveAuthData(
        accessToken: String,
        refreshToken: String,
        userId: Long,
        email: String,
        fullName: String,
        role: String
    ) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = accessToken
            prefs[REFRESH_TOKEN] = refreshToken
            prefs[USER_ID] = userId
            prefs[USER_EMAIL] = email
            prefs[USER_FULL_NAME] = fullName
            prefs[USER_ROLE] = role
        }
    }

    suspend fun clearAuthData() {
        context.dataStore.edit { it.clear() }
    }
}
