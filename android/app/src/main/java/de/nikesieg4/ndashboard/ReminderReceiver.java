package de.nikesieg4.ndashboard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Eine geplante Termin-Erinnerung ist fällig: Benachrichtigung zeigen (auch bei geschlossener App). */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Notifier.post(ctx, intent.getStringExtra(Notifier.EXTRA_ID), intent.getStringExtra(Notifier.EXTRA_TITLE),
                intent.getStringExtra(Notifier.EXTRA_BODY), intent.getStringExtra(Notifier.EXTRA_URL));
    }
}
