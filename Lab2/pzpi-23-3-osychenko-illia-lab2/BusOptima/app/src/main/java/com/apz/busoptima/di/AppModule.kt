package com.apz.busoptima.di

// TokenDataStore та репозиторії провайдяться через @Inject constructor + @Singleton
// Hilt автоматично керує ними через компонент SingletonComponent.
// Цей модуль залишений для майбутніх провайдерів, що не мають @Inject constructor.
