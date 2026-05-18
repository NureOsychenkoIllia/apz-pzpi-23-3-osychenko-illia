package com.apz.busoptima

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import com.apz.busoptima.ui.navigation.AppNavigation
import com.apz.busoptima.ui.screens.login.LoginViewModel
import com.apz.busoptima.ui.theme.BusOptimaTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import com.apz.busoptima.data.local.TokenDataStore
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var tokenDataStore: TokenDataStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val isLoggedIn = runBlocking { tokenDataStore.isLoggedIn.first() }

        setContent {
            BusOptimaTheme {
                AppNavigation(isLoggedIn = isLoggedIn)
            }
        }
    }
}
