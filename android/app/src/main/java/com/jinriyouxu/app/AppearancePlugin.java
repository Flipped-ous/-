package com.jinriyouxu.app;

import android.app.Activity;
import android.graphics.drawable.ColorDrawable;
import android.view.View;
import android.view.ViewTreeObserver;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Colors the native gutters used by older Android WebViews for system insets. */
@CapacitorPlugin(name = "Appearance")
public class AppearancePlugin extends Plugin {
    private View root;
    private Boolean keyboardVisible;
    private final ViewTreeObserver.OnGlobalLayoutListener keyboardListener = () -> {
        if (root == null) return;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(root);
        if (insets == null) return;
        boolean visible = insets.isVisible(WindowInsetsCompat.Type.ime());
        if (keyboardVisible == null || keyboardVisible != visible) {
            keyboardVisible = visible;
            JSObject state = new JSObject();
            state.put("visible", visible);
            notifyListeners("keyboardVisibilityChange", state, true);
        }
    };

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            root = getActivity().getWindow().getDecorView();
            root.getViewTreeObserver().addOnGlobalLayoutListener(keyboardListener);
        });
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            if (root != null && root.getViewTreeObserver().isAlive())
                root.getViewTreeObserver().removeOnGlobalLayoutListener(keyboardListener);
            root = null;
        });
    }

    @SuppressWarnings("deprecation")
    static void applyBackground(Activity activity, int color) {
        activity.getWindow().setBackgroundDrawable(new ColorDrawable(color));
        activity.getWindow().getDecorView().setBackgroundColor(color);
        View content = activity.findViewById(android.R.id.content);
        if (content != null) content.setBackgroundColor(color);
        activity.getWindow().setStatusBarColor(color);
        activity.getWindow().setNavigationBarColor(color);
        if (android.os.Build.VERSION.SDK_INT >= 29)
            activity.getWindow().setNavigationBarContrastEnforced(false);
    }

    @PluginMethod
    public void prepareReminderChannels(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            android.app.NotificationManager manager = (android.app.NotificationManager) getActivity().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            android.app.NotificationChannel gentle = new android.app.NotificationChannel("youxu-gentle-v1", "任务温和提醒", android.app.NotificationManager.IMPORTANCE_DEFAULT);
            gentle.setSound(null, null); gentle.enableVibration(true);
            android.app.NotificationChannel alert = new android.app.NotificationChannel("youxu-alert-v1", "任务有声提醒", android.app.NotificationManager.IMPORTANCE_HIGH);
            alert.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION), new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build());
            alert.enableVibration(true);
            manager.createNotificationChannel(gentle); manager.createNotificationChannel(alert);
        }
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            android.content.Intent intent;
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                intent = new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getActivity().getPackageName());
            } else {
                intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:" + getActivity().getPackageName()));
            }
            getActivity().startActivity(intent); call.resolve();
        });
    }

    @PluginMethod
    public void hideKeyboard(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            android.view.inputmethod.InputMethodManager manager = (android.view.inputmethod.InputMethodManager) getActivity().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            android.view.View focused = getActivity().getCurrentFocus();
            if (focused != null && manager != null) manager.hideSoftInputFromWindow(focused.getWindowToken(), 0);
            call.resolve();
        });
    }

    @PluginMethod
    public void setTheme(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getActivity().runOnUiThread(() -> {
            applyBackground(getActivity(), dark ? 0xFF1D1916 : 0xFFF5F1E8);
            WindowCompat.getInsetsController(getActivity().getWindow(), getActivity().getWindow().getDecorView())
                .setAppearanceLightStatusBars(!dark);
            WindowCompat.getInsetsController(getActivity().getWindow(), getActivity().getWindow().getDecorView())
                .setAppearanceLightNavigationBars(!dark);
            call.resolve();
        });
    }
}
