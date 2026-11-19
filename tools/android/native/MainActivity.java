package io.github.jamie9904.lpnlog;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
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
        // Portrait on phones, so the screen doesn't turn while moving about; tablets still turn.
        if (getResources().getConfiguration().smallestScreenWidthDp < 600) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
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
        // The page sets its own text size from the phone's (Settings › Text size), so Android mustn't enlarge it again.
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().getSettings().setTextZoom(100);
        LpnNativePlugin.takeIntent(this, getIntent());
    }

    /* Volume-down starts and stops Live scan while the page asks for it (Settings › Android app); volume-up still
       changes the volume. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN && LpnNativePlugin.volumeScan) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) LpnNativePlugin.volumeDown();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        LpnNativePlugin.takeIntent(this, intent);
    }
}
