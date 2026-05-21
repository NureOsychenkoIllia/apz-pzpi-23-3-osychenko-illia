package com.apz.busoptima.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = BusPrimaryDark,
    onPrimary = BusOnPrimaryDark,
    primaryContainer = BusPrimaryContainerDark,
    onPrimaryContainer = BusOnPrimaryContainerDark,
    secondary = BusSecondaryDark,
    background = BusBackgroundDark,
    surface = BusSurfaceDark,
    onSurface = BusOnSurfaceDark,
    onSurfaceVariant = BusOnSurfaceVariantDark,
    outline = BusOutlineDark,
    error = BusErrorDark
)

private val LightColorScheme = lightColorScheme(
    primary = BusPrimaryLight,
    onPrimary = BusOnPrimaryLight,
    primaryContainer = BusPrimaryContainerLight,
    onPrimaryContainer = BusOnPrimaryContainerLight,
    secondary = BusSecondaryLight,
    background = BusBackgroundLight,
    surface = BusSurfaceLight,
    onSurface = BusOnSurfaceLight,
    onSurfaceVariant = BusOnSurfaceVariantLight,
    outline = BusOutlineLight,
    error = BusErrorLight
)

@Composable
fun BusOptimaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
