package com.jinriyouxu.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppearancePlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        AppearancePlugin.applyBackground(this, getResources().getColor(R.color.paper_background, getTheme()));
    }
}
