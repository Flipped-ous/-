package com.jinriyouxu.app;

import java.text.SimpleDateFormat;
import java.util.*;

/** Pure projection: no widget interaction writes task data. */
public final class TodayWidgetPolicy {
    public static final class Row {
        public final String id, title, explicitTime;
        public final long dueAt;
        public final boolean pending, hasTime;
        public final double order;
        public Row(String id, String title, long dueAt, boolean pending, boolean hasTime, String explicitTime, double order) {
            this.id=id; this.title=title; this.dueAt=dueAt; this.pending=pending; this.hasTime=hasTime; this.explicitTime=explicitTime; this.order=order;
        }
        public String time() {
            if (!hasTime) return "";
            return explicitTime.isEmpty() ? new SimpleDateFormat("HH:mm", Locale.ROOT).format(new Date(dueAt)) : explicitTime;
        }
    }
    public static List<Row> pendingToday(List<Row> rows, long now) {
        List<Row> result=new ArrayList<>();
        String today=WrapSchedulePolicy.day(now);
        for(Row row:rows) if(row.pending && WrapSchedulePolicy.day(row.dueAt).equals(today)) result.add(row);
        result.sort(Comparator.comparing((Row row)->row.hasTime?row.time():"99:99").thenComparingDouble(row->row.order));
        return result;
    }
    public static int todayCount(List<Row> rows, long now) {
        int count=0; String today=WrapSchedulePolicy.day(now);
        for(Row row:rows) if(WrapSchedulePolicy.day(row.dueAt).equals(today)) count++;
        return count;
    }
    public static int visibleRows(int height) { return Math.max(1, Math.min(4, (height-68)/40)); }
}
