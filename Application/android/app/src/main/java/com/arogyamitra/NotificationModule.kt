package com.arogyamitra

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID = "arogya_mitra_alerts"
        const val CHANNEL_NAME = "ArogyaMitra Alerts"
        const val CHANNEL_DESC = "Official notices, scheme approvals, and document requests from Admin"
    }

    init {
        createNotificationChannel()
    }

    override fun getName(): String {
        return "ArogyaNotificationModule"
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                enableLights(true)
                lightColor = Color.parseColor("#0A5C53")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 200, 250)
            }
            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showNotification(title: String, message: String, notificationId: Int, dataJson: String?) {
        try {
            val intent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("data", dataJson)
            }

            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getActivity(
                reactContext,
                notificationId,
                intent,
                pendingIntentFlags
            )

            val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val smallIconResId = reactContext.resources.getIdentifier(
                "ic_launcher",
                "mipmap",
                reactContext.packageName
            )

            val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(if (smallIconResId != 0) smallIconResId else android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setColor(Color.parseColor("#0A5C53"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(longArrayOf(0, 250, 200, 250))
                .setContentIntent(pendingIntent)

            val notificationManager = NotificationManagerCompat.from(reactContext)
            
            // Check permission on Android 13+
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(
                    reactContext,
                    "android.permission.POST_NOTIFICATIONS"
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                val safeId = if (notificationId != 0) notificationId else System.currentTimeMillis().toInt()
                notificationManager.notify(safeId, builder.build())
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                reactContext,
                "android.permission.POST_NOTIFICATIONS"
            ) == PackageManager.PERMISSION_GRANTED
            promise.resolve(granted)
        } else {
            val areEnabled = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
            promise.resolve(areEnabled)
        }
    }
}
