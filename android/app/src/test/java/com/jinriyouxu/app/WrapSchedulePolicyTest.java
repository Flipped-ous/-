package com.jinriyouxu.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class WrapSchedulePolicyTest {
    private long at(int year, int month, int day, int hour, int minute) {
        Calendar date = Calendar.getInstance(); date.clear(); date.set(year, month - 1, day, hour, minute); return date.getTimeInMillis();
    }
    @Test public void nextNeverCatchesUpAndRollsYear() {
        assertEquals(at(2027,1,1,21,0), WrapSchedulePolicy.next("21:00", at(2026,12,31,21,1)));
        assertEquals(at(2026,10,18,21,0), WrapSchedulePolicy.next("21:00", at(2026,10,18,20,59)));
        assertEquals(at(2026,10,19,21,0), WrapSchedulePolicy.next("21:00", at(2026,10,18,21,0)));
    }
    @Test public void disabledDuplicateAndStaleChecksStayQuiet() {
        long now = at(2026,10,18,21,10), expected = at(2026,10,18,21,0);
        assertTrue(WrapSchedulePolicy.shouldCheck(true,expected,now,""));
        assertFalse(WrapSchedulePolicy.shouldCheck(false,expected,now,""));
        assertFalse(WrapSchedulePolicy.shouldCheck(true,expected,now,"2026-10-18"));
        assertFalse(WrapSchedulePolicy.shouldCheck(true,at(2026,10,17,21,0),now,""));
        assertFalse(WrapSchedulePolicy.shouldCheck(true,at(2026,10,19,21,0),now,""));
    }
    @Test public void includesTonightButNotFutureOrCompleted() {
        long now = at(2026,10,18,21,0);
        assertTrue(WrapSchedulePolicy.eligible(true,at(2026,10,18,21,30),now));
        assertTrue(WrapSchedulePolicy.eligible(true,at(2026,10,17,8,0),now));
        assertFalse(WrapSchedulePolicy.eligible(true,at(2026,10,19,0,0),now));
        assertFalse(WrapSchedulePolicy.eligible(false,at(2026,10,17,8,0),now));
    }
    @Test public void reschedulingUsesCurrentTimeZoneAndDst() {
        TimeZone previous = TimeZone.getDefault();
        try {
            for (String zone : new String[]{"Asia/Shanghai","UTC","America/New_York"}) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone));
                long next = WrapSchedulePolicy.next("21:00",at(2026,3,7,22,0));
                assertEquals(at(2026,3,8,21,0),next);
                assertEquals("2026-03-08",WrapSchedulePolicy.day(next));
            }
        } finally { TimeZone.setDefault(previous); }
    }
}
