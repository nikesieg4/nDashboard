package de.nikesieg4.ndashboard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Nach einem Neustart des Handys (oder einem App-Update) sind alle Alarme weg – Erinnerungen neu planen. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Notifier.reschedule(ctx);
        }
    }
}
