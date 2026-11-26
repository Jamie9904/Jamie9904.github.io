package io.github.jamie9904.lpnlog;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
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
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/* Live read manifest: the camera reads the printed page as it's moved down it, with ML Kit's text reader (inside the
   app, no internet). Only a number printed straight after an "LPN:" label is taken, and only once the same number has
   been read the same way in two pictures within a few seconds, so a misread letter in one picture isn't added. Each
   number goes to the page once ("textScan"), which tidies it with the app's own photo rules and prefix list, adds it to
   the manifest numbers and sends back what to show here (textScanStatus). */
public class TextScanActivity extends AppCompatActivity {
    static volatile TextScanActivity current = null;
    private PreviewView preview;
    private TextView status, recent;
    private Button torchBtn, undoBtn;
    private Camera camera;
    private ExecutorService exec;
    private volatile TextRecognizer reader;
    private boolean torch = false;
    private FrameView frame;
    // "LPN" with or without its colon, maybe with the number stuck on ("LPN:VLT004040265").
    private static final Pattern LABEL = Pattern.compile("^LPN[:;.,]?(.*)$");
    private final Map<String, Long> seen = new HashMap<>();
    private final Set<String> sent = new HashSet<>();
    static volatile String sRecent = "", sText = null;
    static volatile boolean sCanUndo = false;
    // "manifest": numbers after an "LPN:" label. "log": a printed log, where the LPNs stand on their own, so any word
    // shaped like an LPN (letters then 8 to 12 digits) is taken.
    private boolean logMode = false;
    private static final Pattern LPN_WORD = Pattern.compile("^[A-Z]{1,4}[0-9OIDLSBZ]{8,12}$");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = this;
        logMode = "log".equals(getIntent().getStringExtra("target"));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        root.addView(preview, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        int pad = dp(14);
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.VERTICAL);
        strip.setBackgroundColor(Color.parseColor("#D90c1830"));
        status = new TextView(this);
        status.setTextColor(Color.WHITE);
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        status.setText(sText != null ? sText : logMode ? "Hold the phone over the printed log and move it slowly down the page. Each LPN is added when it has been read clearly."
            : "Hold the phone over the manifest and move it slowly down the page. Each “LPN:” number is added when it has been read clearly.");
        status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        strip.addView(status);
        recent = new TextView(this);
        recent.setTextColor(Color.parseColor("#9db0d0"));
        recent.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        recent.setPadding(0, dp(4), 0, 0);
        strip.addView(recent);
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.HORIZONTAL);
        panel.setGravity(Gravity.CENTER_VERTICAL);
        android.graphics.drawable.GradientDrawable sheetBg = new android.graphics.drawable.GradientDrawable();
        sheetBg.setColor(Color.parseColor("#F20c1830"));
        float sheetR = dp(28); sheetBg.setCornerRadii(new float[] { sheetR, sheetR, sheetR, sheetR, 0, 0, 0, 0 });
        panel.setBackground(sheetBg); // a rounded sheet, as in the camera scanner
        undoBtn = button("Remove last");
        undoBtn.setContentDescription("Remove the last number added");
        undoBtn.setOnClickListener(v -> LpnNativePlugin.scanEvent("textScanUndo", new com.getcapacitor.JSObject()));
        panel.addView(undoBtn, new LinearLayout.LayoutParams(0, dp(52), 1.2f));
        torchBtn = button("Torch");
        torchBtn.setOnClickListener(v -> { if (camera != null) { torch = !torch; camera.getCameraControl().enableTorch(torch); torchBtn.setText(torch ? "Torch off" : "Torch"); } });
        torchBtn.setVisibility(android.view.View.GONE);
        panel.addView(torchBtn, gap(new LinearLayout.LayoutParams(0, dp(52), 1f)));
        Button done = button("Done");
        android.graphics.drawable.GradientDrawable dg = new android.graphics.drawable.GradientDrawable();
        dg.setCornerRadius(dp(16)); dg.setColor(Color.parseColor("#ff8a2a"));
        done.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), dg, null));
        done.setTextColor(Color.parseColor("#1a0e02")); done.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        done.setOnClickListener(v -> finish());
        panel.addView(done, gap(new LinearLayout.LayoutParams(0, dp(52), 1f)));
        frame = new FrameView(this, strip, panel, getResources().getDisplayMetrics().density);
        root.addView(frame, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(strip, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));
        root.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        strip.setPadding(pad, pad + dp(24), pad, pad);
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
        else ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.CAMERA }, 8);
    }

    private LinearLayout.LayoutParams gap(LinearLayout.LayoutParams lp) { lp.setMarginStart(dp(6)); return lp; }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setPadding(dp(4), 0, dp(4), 0);
        b.setMinWidth(0); b.setMinimumWidth(0);
        b.setMaxLines(2);
        androidx.core.widget.TextViewCompat.setAutoSizeTextTypeUniformWithConfiguration(b, 11, 17, 1, TypedValue.COMPLEX_UNIT_SP);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        // As in the camera scanner: rounded, a light outline on the dark panel (Done is the orange main button).
        g.setCornerRadius(dp(16)); g.setStroke(dp(1), Color.parseColor("#3Dffffff")); g.setColor(Color.TRANSPARENT);
        b.setBackground(new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(Color.parseColor("#33ffffff")), g, null));
        b.setTextColor(new ColorStateList(new int[][] { { -android.R.attr.state_enabled }, {} }, new int[] { Color.parseColor("#6b7d99"), Color.parseColor("#eaf0fa") }));
        return b;
    }

    /* A wide frame across the page (manifest lines run across), flashing green when a number is added and orange when
       it is skipped. Touches pass through to the picture (tap-to-focus). */
    private static class FrameView extends android.view.View {
        private final android.graphics.Paint dim = new android.graphics.Paint(), line = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        private final android.view.View top, bottom;
        private final float d;
        private int colour = Color.WHITE;
        FrameView(android.content.Context c, android.view.View top, android.view.View bottom, float density) {
            super(c); this.top = top; this.bottom = bottom; d = density;
            dim.setColor(Color.parseColor("#59000000"));
            line.setStyle(android.graphics.Paint.Style.STROKE);
            setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        }
        void flash(int c) { colour = c; invalidate(); postDelayed(() -> { colour = Color.WHITE; invalidate(); }, 650); }
        @Override protected void onDraw(android.graphics.Canvas cv) {
            float t = top.getBottom() + 16 * d, b = bottom.getTop() - 16 * d, h = Math.max(0, b - t);
            float fw = getWidth() * 0.92f, fh = Math.min(h * 0.9f, fw * 1.1f), cx = getWidth() / 2f, cy = t + h / 2f;
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

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startCamera();
        else finish();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> f = ProcessCameraProvider.getInstance(this);
        f.addListener(() -> {
            try {
                ProcessCameraProvider provider = f.get();
                Preview p = new Preview.Builder().build();
                p.setSurfaceProvider(preview.getSurfaceProvider());
                // A larger picture than for barcodes: printed text is small.
                ImageAnalysis a = new ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setTargetResolution(new android.util.Size(1280, 1920)).build();
                a.setAnalyzer(exec, this::analyze);
                provider.unbindAll();
                camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, p, a);
                if (camera.getCameraInfo().hasFlashUnit()) torchBtn.setVisibility(android.view.View.VISIBLE);
                reader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            } catch (Exception e) { finish(); }
        }, ContextCompat.getMainExecutor(this));
    }

    private static String clean(String s) { return s == null ? "" : s.toUpperCase().replaceAll("[^A-Z0-9]", ""); }

    /* The numbers straight after an "LPN" label in one picture, in reading order. A number read with a gap in it
       ("QUB00191 1625") is joined when the second part is digits only. */
    static List<String> afterLabels(List<String> words) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < words.size(); i++) {
            Matcher m = LABEL.matcher(words.get(i).toUpperCase().trim());
            if (!m.matches()) continue;
            String n = clean(m.group(1)); int next = i + 1;
            if (n.isEmpty() && next < words.size()) { n = clean(words.get(next)); next++; }
            if (n.length() >= 4 && n.length() < 11 && next < words.size() && clean(words.get(next)).matches("[0-9]{1,8}")) n += clean(words.get(next));
            if (n.length() >= 9 && n.length() <= 16 && n.matches(".*[0-9]{6,}.*")) out.add(n);
        }
        return out;
    }

    /* A printed log: every word shaped like an LPN, with a number read with a gap in it joined. */
    static List<String> lpnWords(List<String> words) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < words.size(); i++) {
            String n = clean(words.get(i));
            if (n.length() >= 4 && n.length() < 11 && n.matches("[A-Z]{1,4}[0-9]+") && i + 1 < words.size() && clean(words.get(i + 1)).matches("[0-9]{1,8}")) { n += clean(words.get(i + 1)); i++; }
            if (LPN_WORD.matcher(n).matches() && n.replaceAll("[^0-9]", "").length() >= 6) out.add(n);
        }
        return out;
    }

    // About four readings a second: numbers are still picked up as quickly, and the phone stays cooler on long pages.
    private long lastRun = 0;

    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyze(ImageProxy img) {
        TextRecognizer r = reader;
        long t0 = System.currentTimeMillis();
        if (img.getImage() == null || r == null || t0 - lastRun < 250) { img.close(); return; }
        lastRun = t0;
        InputImage in = InputImage.fromMediaImage(img.getImage(), img.getImageInfo().getRotationDegrees());
        r.process(in).addOnSuccessListener(t -> {
            List<String> words = new ArrayList<>();
            for (Text.TextBlock b : t.getTextBlocks()) for (Text.Line l : b.getLines()) for (Text.Element e : l.getElements()) words.add(e.getText());
            long now = System.currentTimeMillis();
            for (String n : logMode ? lpnWords(words) : afterLabels(words)) {
                if (sent.contains(n)) continue;
                Long at = seen.get(n);
                if (at != null && now - at < 5000) { sent.add(n); LpnNativePlugin.scanEvent("textScan", new com.getcapacitor.JSObject().put("value", n)); }
                else seen.put(n, now);
            }
            if (seen.size() > 400) seen.clear();
        }).addOnCompleteListener(x -> img.close());
    }

    private void applyState() {
        recent.setText(sRecent == null ? "" : sRecent);
        recent.setVisibility(sRecent == null || sRecent.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        undoBtn.setEnabled(sCanUndo);
    }

    /* What the page says about the last number (added, already in the list, skipped), with a flash. */
    static void show(String text, String flash, String recentText, boolean canUndo, String forget) {
        sRecent = recentText; sCanUndo = canUndo; if (text != null) sText = text;
        TextScanActivity a = current;
        if (a == null) return;
        a.runOnUiThread(() -> {
            if (text != null) a.status.setText(text);
            if (forget != null) { a.sent.remove(forget); a.seen.remove(forget); } // removed: it can be read again
            a.applyState();
            if ("ok".equals(flash)) a.frame.flash(Color.parseColor("#3ccf6e"));
            if ("warn".equals(flash)) a.frame.flash(Color.parseColor("#ff8a2a"));
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (current == this) current = null;
        sText = null;
        if (exec != null) exec.shutdown();
        if (reader != null) reader.close();
        LpnNativePlugin.scanEvent("textScanClosed", new com.getcapacitor.JSObject());
    }
}
