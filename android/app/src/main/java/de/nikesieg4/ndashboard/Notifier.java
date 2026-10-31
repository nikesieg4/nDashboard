package de.nikesieg4.ndashboard;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Benachrichtigungen der App: sofort anzeigen (Eilmeldungen, PC-Warnungen) und Termin-Erinnerungen
 * planen. Erinnerungen laufen über den AlarmManager, also auch bei geschlossener App; die Liste liegt in
 * den SharedPreferences, damit sie nach einem Neustart des Handys wieder geplant werden kann (BootReceiver).
 */
final class Notifier {
    static final String EXTRA_ID = "id", EXTRA_TITLE = "title", EXTRA_BODY = "body", EXTRA_URL = "url";
    private static final String PREFS = "notifier", KEY_REMINDERS = "reminders";
    private static final String CHANNEL_CALENDAR = "termine", CHANNEL_INFO = "hinweise";

    private Notifier() {
    }

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL_CALENDAR, "Termine", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel(CHANNEL_INFO, "Eilmeldungen und Warnungen", NotificationManager.IMPORTANCE_DEFAULT));
    }

    /** Zeigt eine Benachrichtigung; ein Tipp darauf öffnet die App auf der Seite {@code url} (Hash, z. B. #/calendar). */
    @SuppressWarnings("deprecation")
    static void post(Context ctx, String id, String title, String body, String url) {
        ensureChannels(ctx);
        Intent open = new Intent(ctx, MainActivity.class)
                .putExtra(EXTRA_URL, url)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String channel = id.startsWith("cal:") ? CHANNEL_CALENDAR : CHANNEL_INFO;
        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? new Notification.Builder(ctx, channel) : new Notification.Builder(ctx);
        b.setSmallIcon(R.drawable.ic_stat_notify)
                .setColor(0xFFF4D24C)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(tap)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true);
        if (channel.equals(CHANNEL_CALENDAR)) {
            b.setCategory(Notification.CATEGORY_REMINDER);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
            }
        }
        ctx.getSystemService(NotificationManager.class).notify(id.hashCode(), b.build());
    }

    /** Ersetzt alle geplanten Erinnerungen durch {@code json} ([{id, at, title, body, url}, …]). */
    static void setReminders(Context ctx, String json) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        cancelAll(ctx, prefs.getString(KEY_REMINDERS, "[]"));
        prefs.edit().putString(KEY_REMINDERS, json).apply();
        schedule(ctx, json);
    }

    /** Nach einem Neustart des Handys die gespeicherten Erinnerungen wieder planen. */
    static void reschedule(Context ctx) {
        schedule(ctx, ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_REMINDERS, "[]"));
    }

    private static void schedule(Context ctx, String json) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        long now = System.currentTimeMillis();
        try {
            JSONArray list = new JSONArray(json);
            for (int i = 0; i < list.length(); i++) {
                JSONObject r = list.getJSONObject(i);
                long at = r.getLong("at");
                if (at <= now) {
                    continue;
                }
                PendingIntent pi = alarm(ctx, r.getString("id"), r.optString("title"), r.optString("body"), r.optString("url"));
                if (exact) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                }
            }
        } catch (Exception ignored) {
            // kaputte Liste: nichts planen
        }
    }

    private static void cancelAll(Context ctx, String json) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        try {
            JSONArray list = new JSONArray(json);
            for (int i = 0; i < list.length(); i++) {
                JSONObject r = list.getJSONObject(i);
                am.cancel(alarm(ctx, r.getString("id"), "", "", ""));
            }
        } catch (Exception ignored) {
            // nichts zu löschen
        }
    }

    private static PendingIntent alarm(Context ctx, String id, String title, String body, String url) {
        Intent intent = new Intent(ctx, ReminderReceiver.class)
                .setAction("de.nikesieg4.ndashboard.REMINDER." + id)
                .putExtra(EXTRA_ID, id).putExtra(EXTRA_TITLE, title).putExtra(EXTRA_BODY, body).putExtra(EXTRA_URL, url);
        return PendingIntent.getBroadcast(ctx, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
