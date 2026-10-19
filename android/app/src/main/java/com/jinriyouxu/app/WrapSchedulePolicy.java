package com.jinriyouxu.app;
import java.util.*;
import java.text.SimpleDateFormat;
/** Pure local-time policy, exercised on the JVM without an Android notification mock. */
public final class WrapSchedulePolicy {
    private WrapSchedulePolicy() {}
    public static String day(long at) { return new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date(at)); }
    public static long next(String time, long now) {
        Calendar next = Calendar.getInstance(); next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2)));
        next.set(Calendar.MINUTE, Integer.parseInt(time.substring(3, 5)));
        next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= now) next.add(Calendar.DAY_OF_MONTH, 1);
        return next.getTimeInMillis();
    }
    public static boolean shouldCheck(boolean enabled, long expected, long now, String lastDay) {
        String today = day(now);
        return enabled && expected <= now && day(expected).equals(today) && !today.equals(lastDay);
    }
    public static boolean eligible(boolean pending, long due, long now) {
        return pending && day(due).compareTo(day(now)) <= 0;
    }
}
