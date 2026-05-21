package com.apz.busoptima

import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.apz.busoptima.app.AppResumeCoordinator
import com.apz.busoptima.ui.navigation.AppNavigation
import com.apz.busoptima.ui.theme.BusOptimaTheme
import dagger.hilt.android.AndroidEntryPoint
import com.apz.busoptima.data.local.TokenDataStore
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    @Inject
    lateinit var tokenDataStore: TokenDataStore

    @Inject
    lateinit var appResumeCoordinator: AppResumeCoordinator

    override fun attachBaseContext(newBase: Context) {
        val prefs = newBase.getSharedPreferences("settings", Context.MODE_PRIVATE)
        val lang = prefs.getString("language", "uk") ?: "uk"
        val locale = Locale.forLanguageTag(lang)
        Locale.setDefault(locale)
        val config = Configuration(newBase.resources.configuration)
        config.setLocale(locale)
        super.attachBaseContext(newBase.createConfigurationContext(config))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val isLoggedIn by tokenDataStore.isLoggedIn.collectAsStateWithLifecycle(initialValue = false)
            val userRole by tokenDataStore.userRole.collectAsStateWithLifecycle(initialValue = null)
            BusOptimaTheme {
                AppNavigation(isLoggedIn = isLoggedIn, userRole = userRole)
            }
        }
    }

    override fun onStart() {
        super.onStart()
        appResumeCoordinator.notifyIfReturnedFromBackground()
        Log.d(TAG, "onStart")
    }

    override fun onStop() {
        if (!isChangingConfigurations) {
            appResumeCoordinator.markBackgrounded()
        }
        Log.d(TAG, "onStop")
        super.onStop()
    }
}
