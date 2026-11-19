package io.github.jamie9904.lpnlog;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.ZoomSuggestionOptions;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/* Live scan with the phone's own camera: CameraX gives ML Kit the live picture (faster than stills from the page),
   with tap-to-focus, automatic zoom for small or distant barcodes, and the torch. What's read goes to the page
   (LpnNativePlugin "nativeScan"), which adds the pallet with the usual checks and sends back what to show here. */
public class ScanActivity extends AppCompatActivity {
    static volatile ScanActivity current = null;
    private PreviewView preview;
    private TextView status;
    private Button torchBtn;
    private Camera camera;
    private ExecutorService exec;
    private volatile BarcodeScanner scanner;
    private volatile String last = "";
    private volatile long lastAt = 0;
    private boolean torch = false;
    private String closeReason = "done";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = this;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        root.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundColor(Color.parseColor("#E60c1830"));
        int pad = dp(16);
        panel.setPadding(pad, pad, pad, pad);
        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        status.setText("Point the camera at a pallet barcode. Tap the picture to focus.");
        status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        panel.addView(status);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(12), 0, 0);
        torchBtn = button("Torch");
        torchBtn.setOnClickListener(v -> { if (camera != null) { torch = !torch; camera.getCameraControl().enableTorch(torch); torchBtn.setText(torch ? "Torch off" : "Torch"); } });
        torchBtn.setVisibility(android.view.View.GONE);
        Button done = button("Done");
        done.setOnClickListener(v -> finish());
        row.addView(torchBtn, new LinearLayout.LayoutParams(0, dp(52), 1f));
        LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(0, dp(52), 1f);
        dl.setMarginStart(dp(12));
        row.addView(done, dl);
        panel.addView(row);
        FrameLayout.LayoutParams pl = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        root.addView(panel, pl);
        ViewCompat.setOnApplyWindowInsetsListener(panel, (v, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(pad + b.left, pad, pad + b.right, pad + b.bottom);
            return insets;
        });
        setContentView(root);
        preview.setOnTouchListener((v, e) -> {
            if (e.getAction() == MotionEvent.ACTION_UP && camera != null) {
                MeteringPoint p = preview.getMeteringPointFactory().createPoint(e.getX(), e.getY());
                camera.getCameraControl().startFocusAndMetering(new FocusMeteringAction.Builder(p).build());
                v.performClick();
            }
            return true;
        });
        exec = Executors.newSingleThreadExecutor();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startCamera();
        else ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.CAMERA }, 7);
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        return b;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startCamera();
        else { closeReason = "denied"; finish(); }
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> f = ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try {
                ProcessCameraProvider provider = f.get();
                Preview p = new Preview.Builder().build();
                p.setSurfaceProvider(preview.getSurfaceProvider());
                ImageAnalysis a = new ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                a.setAnalyzer(exec, this::analyze);
                provider.unbindAll();
                camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, p, a);
                if (camera.getCameraInfo().hasFlashUnit()) torchBtn.setVisibility(android.view.View.VISIBLE);
                float max = 1f;
                if (camera.getCameraInfo().getZoomState().getValue() != null) max = camera.getCameraInfo().getZoomState().getValue().getMaxZoomRatio();
                final Camera cam = camera;
                BarcodeScannerOptions.Builder o = new BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS);
                if (max > 1f) o.setZoomSuggestionOptions(new ZoomSuggestionOptions.Builder(ratio -> { cam.getCameraControl().setZoomRatio(ratio); return true; }).setMaxSupportedZoomRatio(max).build());
                scanner = BarcodeScanning.getClient(o.build());
            } catch (Exception e) { closeReason = "error"; finish(); }
        }, ContextCompat.getMainExecutor(this));
    }

    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyze(ImageProxy img) {
        BarcodeScanner s = scanner;
        if (img.getImage() == null || s == null) { img.close(); return; }
        InputImage in = InputImage.fromMediaImage(img.getImage(), img.getImageInfo().getRotationDegrees());
        s.process(in).addOnSuccessListener(list -> {
            List<String> values = new ArrayList<>();
            for (Barcode b : list) if (b.getRawValue() != null && !b.getRawValue().isEmpty()) values.add(b.getRawValue());
            if (values.isEmpty()) return;
            String key = android.text.TextUtils.join("|", values);
            long now = System.currentTimeMillis();
            if (key.equals(last) && now - lastAt < 2500) { lastAt = now; return; } // the same barcode still in view
            last = key; lastAt = now;
            LpnNativePlugin.scanned(values);
        }).addOnCompleteListener(t -> img.close());
    }

    /* What the page says about the last scan ("Added …", a warning). close: back to the app (to answer a warning). */
    static void show(String text, boolean close) {
        ScanActivity a = current;
        if (a == null) return;
        a.runOnUiThread(() -> { if (text != null) a.status.setText(text); if (close) { a.closeReason = "check"; a.finish(); } });
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN && LpnNativePlugin.volumeScan) {
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) finish();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (current == this) current = null;
        if (exec != null) exec.shutdown();
        if (scanner != null) scanner.close();
        LpnNativePlugin.scanClosed(closeReason);
    }
}
