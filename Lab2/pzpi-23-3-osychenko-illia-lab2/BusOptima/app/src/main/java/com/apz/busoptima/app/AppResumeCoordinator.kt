package com.apz.busoptima.app

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppResumeCoordinator @Inject constructor() {

    private val _appResumed = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val appResumed = _appResumed.asSharedFlow()

    private var wasBackgrounded = false

    fun markBackgrounded() {
        wasBackgrounded = true
    }

    fun notifyIfReturnedFromBackground() {
        if (!wasBackgrounded) return
        wasBackgrounded = false
        _appResumed.tryEmit(Unit)
    }
}
