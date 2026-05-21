package com.apz.busoptima.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.apz.busoptima.R
import com.apz.busoptima.ui.screens.analytics.AnalyticsScreen
import com.apz.busoptima.ui.screens.login.LoginScreen
import com.apz.busoptima.ui.screens.login.LoginViewModel
import com.apz.busoptima.ui.screens.profile.ProfileScreen
import com.apz.busoptima.ui.screens.tripdetail.TripDetailScreen
import com.apz.busoptima.ui.screens.trips.TripsScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Trips : Screen("trips")
    object TripDetail : Screen("trip_detail/{tripId}") {
        fun createRoute(tripId: Long) = "trip_detail/$tripId"
    }
    object Analytics : Screen("analytics")
    object Profile : Screen("profile")
}

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val icon: ImageVector
)

@Composable
private fun rememberBottomNavItems(isDriver: Boolean) = buildList {
    add(BottomNavItem(Screen.Trips, stringResource(R.string.nav_trips), Icons.Default.DirectionsBus))
    if (!isDriver) {
        add(BottomNavItem(Screen.Analytics, stringResource(R.string.nav_analytics), Icons.Default.Analytics))
    }
    add(BottomNavItem(Screen.Profile, stringResource(R.string.nav_profile), Icons.Default.Person))
}

@Composable
fun AppNavigation(isLoggedIn: Boolean, userRole: String?) {
    val navController = rememberNavController()
    val isDriver = userRole == "driver"

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) Screen.Trips.route else Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            val viewModel: LoginViewModel = hiltViewModel()
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Trips.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Trips.route) {
            MainScaffold(navController, Screen.Trips, isDriver) {
                TripsScreen(
                    isDriver = isDriver,
                    onTripClick = { tripId ->
                        navController.navigate(Screen.TripDetail.createRoute(tripId))
                    }
                )
            }
        }

        composable(
            route = Screen.TripDetail.route,
            arguments = listOf(navArgument("tripId") { type = NavType.LongType })
        ) { backStackEntry ->
            val tripId = backStackEntry.arguments?.getLong("tripId") ?: return@composable
            TripDetailScreen(
                tripId = tripId,
                isDriver = isDriver,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Analytics.route) {
            MainScaffold(navController, Screen.Analytics, isDriver) {
                AnalyticsScreen()
            }
        }

        composable(Screen.Profile.route) {
            MainScaffold(navController, Screen.Profile, isDriver) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun MainScaffold(
    navController: androidx.navigation.NavHostController,
    currentScreen: Screen,
    isDriver: Boolean,
    content: @Composable () -> Unit
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val visibleItems = rememberBottomNavItems(isDriver)

    Scaffold(
        bottomBar = {
            NavigationBar {
                visibleItems.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.screen.route } == true,
                        onClick = {
                            navController.navigate(item.screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            content()
        }
    }
}
