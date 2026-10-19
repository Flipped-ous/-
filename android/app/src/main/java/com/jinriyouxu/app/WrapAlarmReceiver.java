package com.jinriyouxu.app;
import android.content.*;
public class WrapAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (WrapAlarm.ACTION.equals(intent.getAction())) WrapAlarm.check(context, intent.getLongExtra("at", 0));
        else WrapAlarm.schedule(context);
    }
}
