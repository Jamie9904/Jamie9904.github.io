package io.github.jamie9904.lpnlog;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/* The LPN Pallet Log Android app (tools/android). Copied into the Capacitor project by patch-android.js. */
public class MainActivity extends BridgeActivity {
    private static final int NAVY = Color.parseColor("#0c1830");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LpnNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Newer Android draws apps under the status and navigation bars. Keep the page between them (and above the
        // keyboard), with the bars in the app's navy and light icons.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setBackgroundColor(NAVY);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(NAVY);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(b.left, b.top, b.right, Math.max(b.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        LpnNativePlugin.takeIntent(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        LpnNativePlugin.takeIntent(this, intent);
    }
}
