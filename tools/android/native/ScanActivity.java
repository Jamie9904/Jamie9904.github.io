package io.github.jamie9904.lpnlog;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.widget.CheckBox;
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
   (LpnNativePlugin "nativeScan"), which adds the pallet with the usual checks and sends back what to show here.
   The pallet type, FSDU and Remove last work here too (they change the page's own controls), with the last three
   pallets shown, so the camera needn't be closed during a delivery. */
public class ScanActivity extends AppCompatActivity {
    static volatile ScanActivity current = null;
    private PreviewView preview;
    private TextView status, dcBig;
    private Button torchBtn;
    private Camera camera;
    private ExecutorService exec;
    private volatile BarcodeScanner scanner;
    private volatile String last = "";
    private volatile long lastAt = 0;
    private boolean torch = false, userTorch = false;
    // The torch comes on by itself when the picture stays too dark to read a label (Settings › Android app can turn
    // this off); once the torch button has been used, it's left to the user.
    static volatile boolean sAutoTorch = true;
    private long darkSince = 0, lightAt = 0;
    private String closeReason = "done";
    private static final String[] TYPES = { "BB", "FMCG", "FPP", "Mixed" };
    private final Button[] typeBtns = new Button[TYPES.length];
    private CheckBox fsduBox;
    private Button undoBtn;
    private TextView recent, dcs;
    private final List<Button> allBtns = new ArrayList<>();
    private boolean applying = false;
    // The page's state (type, FSDU, last pallets, bigger buttons), kept so it shows as soon as the scanner opens.
    static volatile String sType = "BB", sRecent = "", sDcs = "";
    static volatile boolean sFsdu = false, sCanUndo = false, sBig = false, sAllIn = false;
    private Button doneBtn;
    // The pallet type colours from the main screen (styles.css --bb, --fm, --fp, --mx), sent by the page; these are the same values.
    static volatile String[] sColours = { "#dba56c", "#6fa8ff", "#a9c95a", "#c79bf0" };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = this;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        root.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // Top: a slim strip with the message and the last pallets. Bottom: the buttons. Between: the camera picture with
        // a tall, narrow aiming frame, as LPN barcodes run upright on the label.
        int pad = dp(14);
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.VERTICAL);
        strip.setBackgroundColor(Color.parseColor("#D90c1830"));
        // The last pallet's DC in large letters ("RUGBY · 3 of 4"), readable at arm's length; orange for an unknown one.
        dcBig = new TextView(this);
        dcBig.setTextColor(Color.WHITE);
        dcBig.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
        dcBig.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        dcBig.setLetterSpacing(0.04f);
        dcBig.setVisibility(android.view.View.GONE);
        strip.addView(dcBig);
        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        status.setText("Line the barcode up in the frame. Tap the picture to focus.");
        status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        strip.addView(status);
        // Pallets per DC so far ("Rugby 12 · Vault 8"), from the page.
        dcs = new TextView(this);
        dcs.setTextColor(Color.parseColor("#dfe7f5"));
        dcs.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        dcs.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        dcs.setPadding(0, dp(6), 0, 0);
        dcs.setVisibility(android.view.View.GONE);
        strip.addView(dcs);
        recent = new TextView(this);
        recent.setTextColor(Color.parseColor("#9db0d0"));
        recent.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        recent.setPadding(0, dp(4), 0, 0);
        strip.addView(recent);
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        // The bottom panel as a rounded sheet, and the types in one dark track (as the app's redesigned screens).
        android.graphics.drawable.GradientDrawable sheetBg = new android.graphics.drawable.GradientDrawable();
        sheetBg.setColor(Color.parseColor("#F20c1830"));
        float sheetR = dp(28); sheetBg.setCornerRadii(new float[] { sheetR, sheetR, sheetR, sheetR, 0, 0, 0, 0 });
        panel.setBackground(sheetBg);
        LinearLayout types = new LinearLayout(this);
        types.setOrientation(LinearLayout.HORIZONTAL);
        android.graphics.drawable.GradientDrawable track = new android.graphics.drawable.GradientDrawable();
        track.setColor(Color.parseColor("#15233f")); track.setCornerRadius(dp(16));
        types.setBackground(track); types.setPadding(dp(4), dp(4), dp(4), dp(4));
        for (int i = 0; i < TYPES.length; i++) {
            final String t = TYPES[i];
            Button b = button(t);
            b.setContentDescription("Pallet type " + t);
            b.setOnClickListener(v -> { sType = t; applyState(); LpnNativePlugin.scanEvent("scanType", new com.getcapacitor.JSObject().put("type", t)); });
            typeBtns[i] = b;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(52), 1f);
            if (i > 0) lp.setMarginStart(dp(4));
            types.addView(b, lp);
        }
        panel.addView(types);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, dp(12), 0, 0);
        fsduBox = new CheckBox(this);
        fsduBox.setText("FSDU");
        fsduBox.setTextColor(Color.WHITE);
        fsduBox.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        fsduBox.setButtonTintList(ColorStateList.valueOf(Color.parseColor("#ff8a2a")));
        fsduBox.setOnCheckedChangeListener((v, on) -> { if (applying) return; sFsdu = on; LpnNativePlugin.scanEvent("scanFsdu", new com.getcapacitor.JSObject().put("on", on)); });
        row.addView(fsduBox, new LinearLayout.LayoutParams(0, dp(52), 1f));
        undoBtn = button("Remove last");
        undoBtn.setContentDescription("Remove last pallet");
        undoBtn.setOnClickListener(v -> LpnNativePlugin.scanEvent("scanUndo", new com.getcapacitor.JSObject()));
        row.addView(undoBtn, gap(new LinearLayout.LayoutParams(0, dp(52), 1.2f)));
        torchBtn = button("Torch");
        torchBtn.setOnClickListener(v -> { if (camera != null) { userTorch = true; torch = !torch; camera.getCameraControl().enableTorch(torch); torchBtn.setText(torch ? "Torch off" : "Torch"); } });
        torchBtn.setVisibility(android.view.View.GONE);
        row.addView(torchBtn, gap(new LinearLayout.LayoutParams(0, dp(52), 1f)));
        Button done = button("Done");
        doneBtn = done;
        done.setOnClickListener(v -> finish());
        row.addView(done, gap(new LinearLayout.LayoutParams(0, dp(52), 1f)));
        panel.addView(row);
        frame = new FrameView(this, strip, panel, getResources().getDisplayMetrics().density);
        root.addView(frame, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(strip, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));
        root.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        strip.setPadding(pad, pad + dp(24), pad, pad); // until the real bar sizes arrive
        panel.setPadding(pad, pad, pad, pad + dp(16));
        getWindow().setStatusBarColor(Color.parseColor("#0c1830"));
        getWindow().setNavigationBarColor(Color.parseColor("#0c1830"));
        androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        ViewCompat.setOnApplyWindowInsetsListener(strip, (v, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(pad + b.left, pad + b.top, pad + b.right, pad);
            return insets;
        });
        ViewCompat.setOnApplyWindowInsetsListener(panel, (v, insets) -> {
            Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(pad + b.left, pad, pad + b.right, pad + b.bottom);
            return insets;
        });
        android.view.View.OnLayoutChangeListener redraw = (v, l, t, r, bt, ol, ot, or, ob) -> frame.invalidate();
        strip.addOnLayoutChangeListener(redraw);
        panel.addOnLayoutChangeListener(redraw);
        setContentView(root);
        preview.setOnTouchListener((v, e) -> {
            if (e.getAction() == MotionEvent.ACTION_UP && camera != null) {
                MeteringPoint p = preview.getMeteringPointFactory().createPoint(e.getX(), e.getY());
                camera.getCameraControl().startFocusAndMetering(new FocusMeteringAction.Builder(p).build());
                v.performClick();
            }
            return true;
        });
        applyState();
        exec = Executors.newSingleThreadExecutor();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startCamera();
        else ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.CAMERA }, 7);
    }

    private LinearLayout.LayoutParams gap(LinearLayout.LayoutParams lp) { lp.setMarginStart(dp(6)); return lp; }

    /* The dimmed picture with a clear, tall aiming frame between the top strip and the buttons. It flashes green when
       a pallet is added and orange when it needs a check. Touches pass through to the picture (tap-to-focus). */
    private FrameView frame;
    private static class FrameView extends android.view.View {
        private final android.graphics.Paint dim = new android.graphics.Paint(), line = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        private final android.view.View top, bottom;
        private final float d;
        private int colour = Color.WHITE;
        FrameView(android.content.Context c, android.view.View top, android.view.View bottom, float density) {
            super(c); this.top = top; this.bottom = bottom; d = density;
            dim.setColor(Color.parseColor("#73000000"));
            line.setStyle(android.graphics.Paint.Style.STROKE);
            setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        }
        void flash(int c) {
            colour = c; invalidate();
            postDelayed(() -> { colour = Color.WHITE; invalidate(); }, 650);
        }
        @Override protected void onDraw(android.graphics.Canvas cv) {
            float t = top.getBottom() + 16 * d, b = bottom.getTop() - 16 * d, h = Math.max(0, b - t);
            float fh = h * 0.9f, fw = Math.min(getWidth() * 0.5f, fh * 0.42f), cx = getWidth() / 2f, cy = t + h / 2f;
            android.graphics.RectF f = new android.graphics.RectF(cx - fw / 2, cy - fh / 2, cx + fw / 2, cy + fh / 2);
            android.graphics.Path p = new android.graphics.Path();
            p.setFillType(android.graphics.Path.FillType.EVEN_ODD);
            p.addRect(0, 0, getWidth(), getHeight(), android.graphics.Path.Direction.CW);
            p.addRoundRect(f, 18 * d, 18 * d, android.graphics.Path.Direction.CW);
            cv.drawPath(p, dim);
            line.setColor(colour);
            line.setStrokeWidth((colour == Color.WHITE ? 3 : 7) * d);
            cv.drawRoundRect(f, 18 * d, 18 * d, line);
        }
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private Button button(String text) {
        Button b = new Button(this);
        allBtns.add(b);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        // Labels always fit: little side padding, two lines if needed, and the text shrinks a little on narrow phones.
        b.setPadding(dp(4), 0, dp(4), 0);
        b.setMinWidth(0); b.setMinimumWidth(0);
        b.setMaxLines(2);
        androidx.core.widget.TextViewCompat.setAutoSizeTextTypeUniformWithConfiguration(b, 11, 17, 1, TypedValue.COMPLEX_UNIT_SP);
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
        checkLight(img);
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

    /* How bright the picture is (every 16th pixel of the brightness plane, twice a second); 1.5 seconds below 45 of 255
       turns the torch on. It isn't turned off by brightness, as the torch itself makes the picture bright. */
    private void checkLight(ImageProxy img) {
        if (!sAutoTorch || torch || userTorch || camera == null || !camera.getCameraInfo().hasFlashUnit()) return;
        long now = System.currentTimeMillis(); if (now - lightAt < 500) return; lightAt = now;
        try {
            ImageProxy.PlaneProxy y = img.getPlanes()[0]; java.nio.ByteBuffer b = y.getBuffer();
            int rs = y.getRowStride(), ps = y.getPixelStride(), w = img.getWidth(), h = img.getHeight(), lim = b.limit(); long sum = 0; int n = 0;
            for (int r = 0; r < h; r += 16) for (int c = 0; c < w; c += 16) { int i = r * rs + c * ps; if (i < lim) { sum += b.get(i) & 0xff; n++; } }
            int avg = n == 0 ? 255 : (int) (sum / n);
            if (avg >= 45) { darkSince = 0; return; }
            if (darkSince == 0) { darkSince = now; return; }
            if (now - darkSince < 1500) return;
            darkSince = 0;
            runOnUiThread(() -> {
                if (torch || userTorch || camera == null) return;
                torch = true; camera.getCameraControl().enableTorch(true); torchBtn.setText("Torch off");
                status.setText("It’s dark, so the torch is on. Tap Torch off to turn it off.");
            });
        } catch (Exception e) {}
    }

    /* Shows the page's state: the chosen type, FSDU, the last pallets, whether there's one to remove, button size. */
    /* Remove last, Torch and Done: the app's dark buttons with a light outline, not Android's grey ones. */
    private void plain(Button b) {
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setCornerRadius(dp(16)); g.setStroke(dp(1), Color.parseColor("#3Dffffff")); g.setColor(Color.TRANSPARENT);
        b.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), g, null));
        b.setTextColor(new ColorStateList(new int[][] { { -android.R.attr.state_enabled }, {} }, new int[] { Color.parseColor("#6b7d99"), Color.parseColor("#eaf0fa") }));
        b.setTypeface(android.graphics.Typeface.DEFAULT);
    }
    private void applyState() {
        if (undoBtn != null) plain(undoBtn);
        if (torchBtn != null) plain(torchBtn);
        applying = true;
        // Like the main screen: the types in a dark track, the chosen one filled with its colour and dark text.
        for (int i = 0; i < TYPES.length; i++) {
            boolean on = TYPES[i].equals(sType);
            int c;
            try { c = Color.parseColor(sColours[i]); } catch (Exception e) { c = Color.GRAY; }
            android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
            g.setCornerRadius(dp(12));
            g.setColor(on ? c : Color.TRANSPARENT);
            typeBtns[i].setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), g, null));
            typeBtns[i].setTextColor(on ? Color.parseColor("#111111") : Color.parseColor("#eaf0fa"));
            typeBtns[i].setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            typeBtns[i].setSelected(on);
        }
        fsduBox.setChecked(sFsdu);
        // All the expected pallets are in: Done stands out in green.
        if (doneBtn != null) {
            if (sAllIn) {
                android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
                g.setCornerRadius(dp(16)); g.setColor(Color.parseColor("#3ccf6e"));
                doneBtn.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), g, null));
                doneBtn.setTextColor(Color.parseColor("#111111"));
                doneBtn.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            } else {
                // Otherwise Done is the main button, in the app's orange.
                android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
                g.setCornerRadius(dp(16)); g.setColor(Color.parseColor("#ff8a2a"));
                doneBtn.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), g, null));
                doneBtn.setTextColor(Color.parseColor("#1a0e02"));
                doneBtn.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            }
        }
        dcs.setText(sDcs == null ? "" : sDcs);
        dcs.setVisibility(sDcs == null || sDcs.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        recent.setText(sRecent == null ? "" : sRecent);
        recent.setVisibility(sRecent == null || sRecent.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        undoBtn.setEnabled(sCanUndo);
        int h = dp(sBig ? 66 : 52);
        for (Button b : allBtns) {
            ViewGroup.LayoutParams lp = b.getLayoutParams(); if (lp != null) { lp.height = h; b.setLayoutParams(lp); }
            androidx.core.widget.TextViewCompat.setAutoSizeTextTypeUniformWithConfiguration(b, 11, sBig ? 20 : 17, 1, TypedValue.COMPLEX_UNIT_SP);
        }
        fsduBox.setTextSize(TypedValue.COMPLEX_UNIT_SP, sBig ? 20 : 17);
        applying = false;
    }

    static void setState(String type, boolean fsdu, String recentText, boolean canUndo, boolean big, String[] colours, boolean allIn, String dcsText) {
        sDcs = dcsText;
        if (type != null) sType = type;
        sAllIn = allIn;
        if (colours != null && colours.length == TYPES.length) sColours = colours;
        sFsdu = fsdu; sRecent = recentText; sCanUndo = canUndo; sBig = big;
        ScanActivity a = current;
        if (a != null) a.runOnUiThread(a::applyState);
    }

    /* What the page says about the last scan ("Added …", a warning). close: back to the app (to answer a warning). */
    static void showDc(String text, boolean warn) {
        ScanActivity a = current;
        if (a == null || a.dcBig == null) return;
        a.runOnUiThread(() -> {
            boolean on = text != null && !text.isEmpty();
            a.dcBig.setText(on ? text : "");
            a.dcBig.setTextColor(Color.parseColor(warn ? "#ff8a2a" : "#ffffff"));
            a.dcBig.setContentDescription(on ? text.toLowerCase(java.util.Locale.UK) : null);
            a.dcBig.setVisibility(on ? android.view.View.VISIBLE : android.view.View.GONE);
        });
    }

    static void show(String text, boolean close, String flash) {
        ScanActivity a = current;
        if (a == null) return;
        a.runOnUiThread(() -> {
            if (text != null) a.status.setText(text);
            if (a.frame != null && "ok".equals(flash)) a.frame.flash(Color.parseColor("#3ccf6e"));
            if (a.frame != null && "warn".equals(flash)) a.frame.flash(Color.parseColor("#ff8a2a"));
            if (close) { a.closeReason = "check"; a.frame.postDelayed(a::finish, "warn".equals(flash) ? 500 : 0); }
        });
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
