package com.jinriyouxu.app;

import android.content.Intent;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;

@CapacitorPlugin(name="TodayWidget")
public class TodayWidgetPlugin extends Plugin {
    @Override protected void handleOnResume() { TodayWidgetProvider.refreshAll(getContext()); }
    @PluginMethod public void getStatus(PluginCall call) {
        JSObject result=new JSObject(); result.put("revision",TodayWidgetProvider.prefs(getContext()).getLong("revision",0)); call.resolve(result);
    }
    @PluginMethod public void updateSnapshot(PluginCall call) {
        Long revision=call.getLong("revision",0L); JSONArray tasks=call.getArray("tasks");
        if(revision<=0||tasks==null) { call.reject("小组件数据无效"); return; }
        try {
            for(int i=0;i<tasks.length();i++) {
                JSONObject row=tasks.getJSONObject(i);
                if(row.getString("id").isEmpty()||row.getString("title").isEmpty()) throw new JSONException("Missing task");
                row.getLong("dueAt"); row.getBoolean("pending"); row.getBoolean("hasTime");
                if(!row.optString("dueTime","").matches("(?:[01]\\d|2[0-3]):[0-5]\\d|")) throw new JSONException("Invalid time");
            }
            synchronized(TodayWidgetProvider.class) {
                android.content.SharedPreferences prefs=TodayWidgetProvider.prefs(getContext());
                if(revision<=prefs.getLong("revision",0)) { call.resolve(); return; }
                if(!prefs.edit().putLong("revision",revision).putBoolean("dark",Boolean.TRUE.equals(call.getBoolean("dark",false))).putString("tasks",tasks.toString()).commit()) { call.reject("桌面小组件更新失败，请重试"); return; }
                TodayWidgetProvider.refreshAll(getContext());
            }
            call.resolve();
        } catch(JSONException error) { call.reject("小组件任务格式无效"); }
    }
    private JSObject take(Intent intent) {
        JSObject result=new JSObject();
        if(intent==null) return result;
        String action=intent.getStringExtra(TodayWidgetProvider.ACTION);
        String task=intent.getStringExtra(TodayWidgetProvider.TASK);
        intent.removeExtra(TodayWidgetProvider.ACTION); intent.removeExtra(TodayWidgetProvider.TASK);
        if(!"today".equals(action)&&!"add".equals(action)&&!"task".equals(action)) return result;
        if("task".equals(action)&&(task==null||task.isEmpty())) return result;
        result.put("action",action); if(task!=null) result.put("taskId",task);
        return result;
    }
    @PluginMethod public void consumeLaunch(PluginCall call) { call.resolve(take(getActivity().getIntent())); }
    @Override protected void handleOnNewIntent(Intent intent) {
        JSObject action=take(intent); if(action.has("action")) notifyListeners("openWidget",action,true);
    }
}
