package com.jinriyouxu.app;
import android.content.Intent;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
@CapacitorPlugin(name = "WrapReminder")
public class WrapReminderPlugin extends Plugin {
    @Override protected void handleOnResume() { WrapAlarm.schedule(getContext()); }
    @PluginMethod public void getStatus(PluginCall call) {
        JSObject result = new JSObject(); result.put("revision", WrapAlarm.prefs(getContext()).getLong("revision", 0)); call.resolve(result);
    }
    @PluginMethod public void updateSnapshot(PluginCall call) {
        String time = call.getString("time", "21:00");
        Long revision = call.getLong("revision", 0L);
        JSONArray tasks = call.getArray("tasks");
        if (!time.matches("(?:[01]\\d|2[0-3]):[0-5]\\d") || revision <= 0 || tasks == null) { call.reject("收工提醒设置无效"); return; }
        synchronized (WrapAlarm.class) {
            android.content.SharedPreferences prefs = WrapAlarm.prefs(getContext());
            if (revision <= prefs.getLong("revision", 0)) { call.resolve(); return; }
            if (!prefs.edit().putLong("revision", revision).putBoolean("enabled", Boolean.TRUE.equals(call.getBoolean("enabled", true)))
                    .putString("time", time).putString("tasks", tasks.toString()).commit()) { call.reject("收工提醒保存失败，请重试"); return; }
            WrapAlarm.schedule(getContext());
        }
        call.resolve();
    }
    @PluginMethod public void consumeLaunch(PluginCall call) {
        Intent intent = getActivity().getIntent();
        boolean requested = intent != null && intent.getBooleanExtra(WrapAlarm.OPEN, false);
        if (requested) intent.removeExtra(WrapAlarm.OPEN);
        JSObject result = new JSObject(); result.put("requested", requested); call.resolve(result);
    }
    @Override protected void handleOnNewIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra(WrapAlarm.OPEN, false)) {
            intent.removeExtra(WrapAlarm.OPEN); notifyListeners("openWrapUp", new JSObject(), true);
        }
    }
}
