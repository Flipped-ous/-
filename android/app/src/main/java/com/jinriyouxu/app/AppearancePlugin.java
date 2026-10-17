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
