package com.jinriyouxu.app;

import android.app.PendingIntent;
import android.app.AlarmManager;
import android.appwidget.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class TodayWidgetProvider extends AppWidgetProvider {
    static final String ACTION="youxu_widget_action", TASK="youxu_widget_task";
    static final String ROLLOVER="com.jinriyouxu.app.WIDGET_DAY_ROLL";
    static android.content.SharedPreferences prefs(Context context) { return context.getSharedPreferences("youxu_today_widget_v1",Context.MODE_PRIVATE); }
    static List<TodayWidgetPolicy.Row> rows(Context context) {
        List<TodayWidgetPolicy.Row> result=new ArrayList<>();
        try {
            JSONArray array=new JSONArray(prefs(context).getString("tasks","[]"));
            for(int i=0;i<array.length();i++) {
                JSONObject row=array.getJSONObject(i);
                result.add(new TodayWidgetPolicy.Row(row.getString("id"),row.getString("title"),row.getLong("dueAt"),row.getBoolean("pending"),row.getBoolean("hasTime"),row.optString("dueTime",""),row.optDouble("order",i)));
            }
        } catch(JSONException ignored) { /* No fabricated task data if a mirror cannot be read. */ }
        return result;
    }
    static PendingIntent launch(Context context,String action,String task) {
        Intent intent=new Intent(context,MainActivity.class).putExtra(ACTION,action).putExtra(TASK,task)
            .setData(Uri.parse("youxu-widget://"+action+"/"+Uri.encode(task)))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void update(Context context,AppWidgetManager manager,int id) {
        android.content.SharedPreferences prefs=prefs(context);
        boolean dark=prefs.getBoolean("dark",false);
        int ink=Color.parseColor(dark?"#EDE6DE":"#28231D");
        long now=System.currentTimeMillis(); List<TodayWidgetPolicy.Row> all=rows(context), pending=TodayWidgetPolicy.pendingToday(all,now);
        RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.today_widget);
        views.setInt(R.id.widget_root,"setBackgroundResource",dark?R.drawable.widget_paper_dark:R.drawable.widget_paper);
        views.setOnClickPendingIntent(R.id.widget_root,launch(context,"today",""));
        views.setOnClickPendingIntent(R.id.widget_add,launch(context,"add",""));
        views.setTextColor(R.id.widget_add,Color.parseColor(dark?"#E09881":"#A55340"));
        int height=manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,160);
        int limit=TodayWidgetPolicy.visibleRows(height);
        int[] lines={R.id.widget_row_0,R.id.widget_row_1,R.id.widget_row_2,R.id.widget_row_3};
        int[] titles={R.id.widget_title_0,R.id.widget_title_1,R.id.widget_title_2,R.id.widget_title_3};
        for(int i=0;i<lines.length;i++) {
            boolean visible=i<pending.size() && i<limit;
            views.setViewVisibility(lines[i],visible?View.VISIBLE:View.GONE);
            if(!visible) continue;
            TodayWidgetPolicy.Row row=pending.get(i);
            views.setTextViewText(titles[i],row.title); views.setTextColor(titles[i],ink);
            views.setInt(lines[i],"setBackgroundResource",dark?R.drawable.widget_task_row_dark:R.drawable.widget_task_row);
            views.setContentDescription(lines[i],row.title+"，点击编辑");
            views.setOnClickPendingIntent(lines[i],launch(context,"task",row.id));
        }
        manager.updateAppWidget(id,views);
    }
    static void refreshAll(Context context) {
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        for(int id:manager.getAppWidgetIds(new ComponentName(context,TodayWidgetProvider.class))) update(context,manager,id);
    }
    static void scheduleDay(Context context) {
        AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(alarms==null) return;
        PendingIntent next=PendingIntent.getBroadcast(context,2100000101,new Intent(context,TodayWidgetProvider.class).setAction(ROLLOVER),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(next);
        if(AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context,TodayWidgetProvider.class)).length==0) return;
        Calendar midnight=Calendar.getInstance(); midnight.add(Calendar.DAY_OF_MONTH,1); midnight.set(Calendar.HOUR_OF_DAY,0); midnight.set(Calendar.MINUTE,0); midnight.set(Calendar.SECOND,0); midnight.set(Calendar.MILLISECOND,0);
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,midnight.getTimeInMillis(),next);
    }
    @Override public void onEnabled(Context context) { scheduleDay(context); }
    @Override public void onDisabled(Context context) { scheduleDay(context); }
    @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids) { for(int id:ids) update(context,manager,id); scheduleDay(context); }
    @Override public void onAppWidgetOptionsChanged(Context context,AppWidgetManager manager,int id,Bundle options) { update(context,manager,id); }
    @Override public void onReceive(Context context,Intent intent) {
        super.onReceive(context,intent);
        String action=intent.getAction();
        if(ROLLOVER.equals(action)||Intent.ACTION_DATE_CHANGED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_BOOT_COMPLETED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) { refreshAll(context); scheduleDay(context); }
    }
}
