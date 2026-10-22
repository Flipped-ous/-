package com.jinriyouxu.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;

public class TodayWidgetPolicyTest {
    long at(int day,int hour) { Calendar c=Calendar.getInstance(); c.clear(); c.set(2026,9,day,hour,0); return c.getTimeInMillis(); }
    TodayWidgetPolicy.Row row(String id,int day,boolean pending,boolean timed,String time,double order) { return new TodayWidgetPolicy.Row(id,id,at(day,12),pending,timed,time,order); }
    @Test public void onlyPendingTodayAndStableOrdering() {
        List<TodayWidgetPolicy.Row> rows=Arrays.asList(row("none",20,true,false,"",0),row("late",20,true,true,"16:00",1),row("early2",20,true,true,"00:00",4),row("early1",20,true,true,"00:00",3),row("yesterday",19,true,true,"08:00",0),row("tomorrow",21,true,false,"",0),row("done",20,false,false,"",0));
        List<TodayWidgetPolicy.Row> result=TodayWidgetPolicy.pendingToday(rows,at(20,23));
        assertEquals(4,result.size()); assertEquals("early1",result.get(0).id); assertEquals("early2",result.get(1).id); assertEquals("late",result.get(2).id); assertEquals("none",result.get(3).id);
        assertEquals(5,TodayWidgetPolicy.todayCount(rows,at(20,0)));
        assertEquals("tomorrow",TodayWidgetPolicy.pendingToday(rows,at(21,0)).get(0).id);
    }
    @Test public void timezoneChangeRecomputesLocalDayAndTime() {
        TimeZone before=TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC")); long due=at(20,20),now=at(21,1);
            List<TodayWidgetPolicy.Row> rows=Arrays.asList(new TodayWidgetPolicy.Row("id","title",due,true,true,"",0));
            assertTrue(TodayWidgetPolicy.pendingToday(rows,now).isEmpty());
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
            assertEquals(1,TodayWidgetPolicy.pendingToday(rows,now).size()); assertEquals("04:00",rows.get(0).time());
        } finally { TimeZone.setDefault(before); }
    }
    @Test public void rowsFitAboveTheAddButtonAcrossSupportedHeights() {
        for(int height=120;height<=500;height++) {
            int rows=TodayWidgetPolicy.visibleRows(height);
            assertTrue(rows*40+68<=height); assertTrue(rows>=1 && rows<=4);
        }
    }
    @Test public void resizingHasAtLeastOneAndAtMostFourRows() {
        assertEquals(1,TodayWidgetPolicy.visibleRows(100)); assertEquals(2,TodayWidgetPolicy.visibleRows(160)); assertEquals(4,TodayWidgetPolicy.visibleRows(260));
        assertTrue(TodayWidgetPolicy.pendingToday(Collections.emptyList(),at(20,1)).isEmpty());
    }
}
