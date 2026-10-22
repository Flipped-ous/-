package com.jinriyouxu.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Device-local mirror only; IndexedDB remains the business source of truth. */
public final class WrapAlarm {
    static final String ACTION = "com.jinriyouxu.app.WRAP_CHECK";
    static final String OPEN = "youxu_open_wrap";
    static final String CHANNEL = "youxu-wrap-gentle-v1";
    static final int REQUEST = 2100000100;
    private WrapAlarm() {}
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("youxu_wrap_v1", Context.MODE_PRIVATE); }
    static String day(long millis) { return WrapSchedulePolicy.day(millis); }
    static PendingIntent alarmIntent(Context context, long at) {
        Intent intent = new Intent(context, WrapAlarmReceiver.class).setAction(ACTION).putExtra("at", at);
        return PendingIntent.getBroadcast(context, REQUEST, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static synchronized void schedule(Context context) {
        SharedPreferences preferences = prefs(context);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        alarms.cancel(alarmIntent(context, 0));
        if (!preferences.getBoolean("enabled", false)) return;
        String time = preferences.getString("time", "21:00");
        long at = WrapSchedulePolicy.next(time, System.currentTimeMillis());
        PendingIntent operation = alarmIntent(context, at);
        try {
            if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
            else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
        } catch (SecurityException denied) { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation); }
    }
    static synchronized void check(Context context, long expectedAt) {
        SharedPreferences preferences = prefs(context);
        long now = System.currentTimeMillis();
        String today = day(now);
        try {
            // A delayed alarm from a previous day is not a catch-up reminder.
            if (!WrapSchedulePolicy.shouldCheck(preferences.getBoolean("enabled", false), expectedAt, now, preferences.getString("lastDay", "")) || preferences.getStringSet("sentDays", Collections.emptySet()).contains(today)) return;
            int count = 0;
            JSONArray tasks = new JSONArray(preferences.getString("tasks", "[]"));
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.getJSONObject(i);
                if (WrapSchedulePolicy.eligible(task.optBoolean("pending"), task.getLong("dueAt"), now)) count++;
            }
            if (count == 0 || !NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(CHANNEL, "收工整理", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setSound(null, null); channel.enableVibration(true); manager.createNotificationChannel(channel);
                if (manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) return;
            }
            Intent launch = new Intent(context, MainActivity.class).putExtra(OPEN, true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent content = PendingIntent.getActivity(context, REQUEST, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification notification = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(com.jinriyouxu.app.R.drawable.ic_stat_note).setColor(0xFFA55340)
                .setContentTitle("收工整理").setContentText("今天辛苦了，还有 " + count + " 项待办没有完成，要整理一下吗？")
                .setStyle(new NotificationCompat.BigTextStyle().bigText("今天辛苦了，还有 " + count + " 项待办没有完成，要整理一下吗？"))
                .setContentIntent(content).setAutoCancel(true).setOnlyAlertOnce(true).build();
            // Persist before posting: duplicate broadcasts cannot notify twice.
            Set<String> sent = new HashSet<>(preferences.getStringSet("sentDays", Collections.emptySet()));
            sent.add(today);
            if (!preferences.edit().putString("lastDay", today).putStringSet("sentDays", sent).commit()) return;
            manager.notify(REQUEST, notification);
        } catch (JSONException | SecurityException error) { android.util.Log.w("YouxuWrap", "Reminder unavailable", error); }
        finally { schedule(context); }
    }
}
