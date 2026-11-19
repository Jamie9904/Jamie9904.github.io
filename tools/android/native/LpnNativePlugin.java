package io.github.jamie9904.lpnlog;

import android.app.Activity;
import android.content.Context;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.content.IntentFilter;
import android.hardware.input.InputManager;
import android.os.BatteryManager;
import android.speech.tts.TextToSpeech;
import android.view.InputDevice;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.activity.BackEventCompat;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import com.getcapacitor.annotation.ActivityCallback;
import java.util.Collections;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/* Android-only helpers for the LPN Pallet Log (used by android.js):
   - decodeBarcodes: Google's ML Kit barcode reader, on the phone (no internet);
   - printPdf: Android's own print screen;
   - keepAwake: keeps the screen on;
   - takePending: a file opened or shared into the app, or a home-screen shortcut (Scan, Manifest check);
   - setVolumeScan / "volumeDown": the volume-down button starts and stops Live scan;
   - cameraAllowed: whether Android has already let the app use the camera;
   - openFile: opens a file the app saved in Documents › LPN Pallet Log in another app;
   - fontScale: the phone's text size;
   - storage (LpnStore) in place of the browser's, without its 10 MB limit;
   - saveAs: Android's own "save to" screen, to put a file in any folder or Drive;
   - Back with Android's predictive back gesture ("back", "backProgress", "backCancelled"; allowExit lets the next Back
     close the app with the system animation);
   - setDelivery: a "Continue" shortcut for the delivery in progress;
   - startScanner / "nativeScan" / scanStatus / "nativeScanClosed": Live scan with the phone's own camera (ScanActivity);
   - speak: says the count after each pallet (Android's own voice, offline);
   - battery: the battery level, for the low-battery reminder;
   - phoneColours: the colours Android 12+ takes from the wallpaper;
   - "scanner": a Bluetooth or USB scanner (or keyboard) connecting or disconnecting. */
@CapacitorPlugin(name = "LpnNative")
public class LpnNativePlugin extends Plugin {
    private static final long MAX_FILE = 40L * 1024 * 1024;
    private static JSObject pending = null;
    private static LpnNativePlugin current = null;
    static volatile boolean volumeScan = false;
    private BarcodeScanner scanner = null;

    private OnBackPressedCallback backCb = null;
    private TextToSpeech tts = null;
    private boolean ttsReady = false;
    private String ttsPending = null;
    private final HashMap<Integer, String> keyboards = new HashMap<>();
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        current = this;
        // The page's storage. Plugins load before the page does, so it's there for the first script.
        WebView wv = getBridge().getWebView();
        wv.addJavascriptInterface(new LpnStore(getContext()), "LpnStore");
        // Smoother scrolling and a renderer Android keeps going while the app is open.
        wv.getSettings().setOffscreenPreRaster(true);
        if (android.os.Build.VERSION.SDK_INT >= 26) wv.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        // Back: the page decides (close a panel, stop the camera, or ask before leaving), with the swipe's progress.
        backCb = new OnBackPressedCallback(true) {
            @Override public void handleOnBackStarted(BackEventCompat e) { notifyListeners("backProgress", new JSObject().put("progress", 0).put("edge", e.getSwipeEdge())); }
            @Override public void handleOnBackProgressed(BackEventCompat e) { notifyListeners("backProgress", new JSObject().put("progress", e.getProgress()).put("edge", e.getSwipeEdge())); }
            @Override public void handleOnBackCancelled() { notifyListeners("backCancelled", new JSObject()); }
            @Override public void handleOnBackPressed() { notifyListeners("back", new JSObject()); }
        };
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), backCb);
        // Scanners that type like a keyboard (Bluetooth or USB): say when one connects or drops off.
        InputManager im = (InputManager) getContext().getSystemService(Context.INPUT_SERVICE);
        for (int id : im.getInputDeviceIds()) { InputDevice d = InputDevice.getDevice(id); if (externalKeys(d)) keyboards.put(id, d.getName()); }
        im.registerInputDeviceListener(new InputManager.InputDeviceListener() {
            @Override public void onInputDeviceAdded(int id) { InputDevice d = InputDevice.getDevice(id); if (externalKeys(d)) { keyboards.put(id, d.getName()); notifyListeners("scanner", new JSObject().put("connected", true).put("name", d.getName())); } }
            @Override public void onInputDeviceRemoved(int id) { String n = keyboards.remove(id); if (n != null) notifyListeners("scanner", new JSObject().put("connected", false).put("name", n)); }
            @Override public void onInputDeviceChanged(int id) {}
        }, main);
    }

    private static boolean externalKeys(InputDevice d) {
        if (d == null || d.isVirtual() || android.os.Build.VERSION.SDK_INT < 29 || !d.isExternal()) return false;
        return (d.getSources() & InputDevice.SOURCE_KEYBOARD) == InputDevice.SOURCE_KEYBOARD;
    }

    @PluginMethod
    public void scanners(PluginCall call) {
        call.resolve(new JSObject().put("names", new JSArray(keyboards.values())));
    }

    @PluginMethod
    public void startScanner(PluginCall call) {
        getActivity().startActivity(new Intent(getActivity(), ScanActivity.class));
        call.resolve();
    }

    static void scanned(List<String> values) {
        if (current != null) current.notifyListeners("nativeScan", new JSObject().put("values", new JSArray(values)));
    }

    static void scanClosed(String reason) {
        if (current != null) current.notifyListeners("nativeScanClosed", new JSObject().put("reason", reason));
    }

    @PluginMethod
    public void scanStatus(PluginCall call) {
        ScanActivity.show(call.getString("text"), Boolean.TRUE.equals(call.getBoolean("close", false)));
        call.resolve();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) { call.resolve(); return; }
        main.post(() -> {
            if (tts == null) {
                ttsPending = text;
                tts = new TextToSpeech(getContext(), st -> {
                    ttsReady = st == TextToSpeech.SUCCESS;
                    if (ttsReady) { tts.setLanguage(Locale.UK); if (ttsPending != null) tts.speak(ttsPending, TextToSpeech.QUEUE_FLUSH, null, "lpn"); }
                    ttsPending = null;
                });
            } else if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lpn");
            call.resolve();
        });
    }

    @PluginMethod
    public void battery(PluginCall call) {
        Intent b = getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (b == null) { call.reject("no battery"); return; }
        int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL || b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) > 0;
        call.resolve(new JSObject().put("level", scale > 0 ? Math.round(level * 100f / scale) : level).put("charging", charging));
    }

    @PluginMethod
    public void phoneColours(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 31) { call.resolve(new JSObject().put("available", false)); return; }
        Context c = getContext();
        String bg = String.format("#%06x", c.getColor(android.R.color.system_neutral1_900) & 0xffffff);
        String ac = String.format("#%06x", c.getColor(android.R.color.system_accent1_300) & 0xffffff);
        call.resolve(new JSObject().put("available", true).put("bg", bg).put("ac", ac));
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) tts.shutdown();
        super.handleOnDestroy();
    }

    /* The next Back within ms closes the app, with Android's own animation. */
    @PluginMethod
    public void allowExit(PluginCall call) {
        final int ms = call.getInt("ms", 2000);
        main.post(() -> {
            if (backCb != null) { backCb.setEnabled(false); main.postDelayed(() -> backCb.setEnabled(true), ms); }
            call.resolve();
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (backCb != null) backCb.setEnabled(true);
    }

    @PluginMethod
    public void saveAs(PluginCall call) {
        if (call.getString("data") == null) { call.reject("no file"); return; }
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType(call.getString("mime", "application/octet-stream")).putExtra(Intent.EXTRA_TITLE, call.getString("name", "file"));
        startActivityForResult(call, i, "saveAsDone");
    }

    @ActivityCallback
    private void saveAsDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(new JSObject().put("saved", false)); return; }
        try (OutputStream os = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            os.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            call.resolve(new JSObject().put("saved", true));
        } catch (Exception e) { call.reject(e.getMessage() == null ? "The file couldn’t be saved there." : e.getMessage()); }
    }

    /* The "Continue" shortcut (long-press the app icon) for the delivery in progress, or none. */
    @PluginMethod
    public void setDelivery(PluginCall call) {
        Context ctx = getContext();
        try {
            String label = call.getString("label");
            if (label == null || label.isEmpty()) ShortcutManagerCompat.removeDynamicShortcuts(ctx, Collections.singletonList("continue"));
            else ShortcutManagerCompat.pushDynamicShortcut(ctx, new ShortcutInfoCompat.Builder(ctx, "continue")
                .setShortLabel("Continue").setLongLabel(label.length() > 25 ? label.substring(0, 25) : label)
                .setIcon(IconCompat.createWithResource(ctx, R.mipmap.ic_launcher))
                .setIntent(new Intent("io.github.jamie9904.lpnlog.CONTINUE").setClassName(ctx, MainActivity.class.getName()))
                .setRank(0).build());
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage() == null ? "shortcut failed" : e.getMessage()); }
    }

    /* Called by MainActivity for the intent that opened the app, and for later ones. */
    static void takeIntent(Activity activity, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if ("io.github.jamie9904.lpnlog.SCAN".equals(action)) { setPending(new JSObject().put("action", "scan")); return; }
        if ("io.github.jamie9904.lpnlog.MANIFEST".equals(action)) { setPending(new JSObject().put("action", "manifest")); return; }
        if ("io.github.jamie9904.lpnlog.CONTINUE".equals(action)) { setPending(new JSObject().put("action", "continue")); return; }
        // Text shared into the app (for example manifest numbers from an email).
        if (Intent.ACTION_SEND.equals(action) && intent.getParcelableExtra(Intent.EXTRA_STREAM) == null && intent.getStringExtra(Intent.EXTRA_TEXT) != null) {
            String t = intent.getStringExtra(Intent.EXTRA_TEXT);
            setPending(new JSObject().put("text", t.length() > 200000 ? t.substring(0, 200000) : t));
            return;
        }
        Uri uri = null;
        if (Intent.ACTION_VIEW.equals(action)) uri = intent.getData();
        else if (Intent.ACTION_SEND.equals(action)) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) return;
        final Uri u = uri;
        final Context ctx = activity.getApplicationContext();
        new Thread(() -> {
            JSObject o = new JSObject();
            try {
                String name = "file";
                try (Cursor c = ctx.getContentResolver().query(u, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
                    if (c != null && c.moveToFirst() && !c.isNull(0)) name = c.getString(0);
                } catch (Exception ignored) {}
                String mime = ctx.getContentResolver().getType(u);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                try (InputStream in = ctx.getContentResolver().openInputStream(u)) {
                    byte[] buf = new byte[65536];
                    int n;
                    long total = 0;
                    while ((n = in.read(buf)) > 0) {
                        total += n;
                        if (total > MAX_FILE) throw new Exception("The file is too large to open (over 40 MB).");
                        out.write(buf, 0, n);
                    }
                }
                o.put("file", new JSObject().put("name", name).put("mime", mime == null ? "" : mime)
                        .put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)));
            } catch (Exception e) {
                o.put("error", e.getMessage() == null ? "The file couldn’t be opened." : e.getMessage());
            }
            setPending(o);
        }).start();
    }

    private static synchronized void setPending(JSObject o) {
        pending = o;
        if (current != null) current.notifyListeners("opened", new JSObject(), true);
    }

    static void volumeDown() {
        if (current != null) current.notifyListeners("volumeDown", new JSObject());
    }

    @PluginMethod
    public void setVolumeScan(PluginCall call) {
        volumeScan = Boolean.TRUE.equals(call.getBoolean("on", false));
        call.resolve();
    }

    /* The phone's text size (1 = normal), so the app can start at a matching Text size. */
    @PluginMethod
    public void fontScale(PluginCall call) {
        call.resolve(new JSObject().put("scale", getContext().getResources().getConfiguration().fontScale));
    }

    @PluginMethod
    public void cameraAllowed(PluginCall call) {
        boolean ok = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        call.resolve(new JSObject().put("allowed", ok));
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.contains("/") || name.contains("..")) { call.reject("no file"); return; }
        try {
            File f = new File(new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "LPN Pallet Log"), name);
            if (!f.exists()) { call.reject("That file is no longer there."); return; }
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(u, mime == null ? "*/*" : mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(i, name));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage() == null ? "No app on this phone can open that file." : e.getMessage()); }
    }

    @PluginMethod
    public void takePending(PluginCall call) {
        JSObject o;
        synchronized (LpnNativePlugin.class) { o = pending; pending = null; }
        call.resolve(o == null ? new JSObject() : o);
    }

    @PluginMethod
    public void keepAwake(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void decodeBarcodes(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("no image"); return; }
        Bitmap bmp;
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) { call.reject("image couldn’t be read"); return; }
        if (bmp == null) { call.reject("image couldn’t be read"); return; }
        if (scanner == null) scanner = BarcodeScanning.getClient();
        final Bitmap b = bmp;
        scanner.process(InputImage.fromBitmap(b, 0))
            .addOnSuccessListener(list -> {
                JSArray arr = new JSArray();
                for (Barcode code : list) {
                    if (code.getRawValue() == null) continue;
                    arr.put(new JSObject().put("rawValue", code.getRawValue()).put("format", code.getFormat()));
                }
                b.recycle();
                call.resolve(new JSObject().put("barcodes", arr));
            })
            .addOnFailureListener(e -> { b.recycle(); call.reject(e.getMessage() == null ? "barcode reader failed" : e.getMessage()); });
    }

    @PluginMethod
    public void printPdf(PluginCall call) {
        String data = call.getString("data");
        final String name = call.getString("name", "LPN Pallet Log");
        if (data == null) { call.reject("no PDF"); return; }
        try {
            final File f = new File(getContext().getCacheDir(), "print.pdf");
            try (FileOutputStream os = new FileOutputStream(f)) { os.write(Base64.decode(data, Base64.DEFAULT)); }
            getActivity().runOnUiThread(() -> {
                try {
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    pm.print(name, new PdfAdapter(f, name), new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                    call.resolve();
                } catch (Exception e) { call.reject(e.getMessage() == null ? "printing isn’t available" : e.getMessage()); }
            });
        } catch (Exception e) { call.reject(e.getMessage() == null ? "printing failed" : e.getMessage()); }
    }

    /* Hands a ready-made PDF to Android's print screen. */
    private static class PdfAdapter extends PrintDocumentAdapter {
        private final File file;
        private final String name;
        PdfAdapter(File file, String name) { this.file = file; this.name = name; }
        @Override
        public void onLayout(PrintAttributes oldA, PrintAttributes newA, CancellationSignal cancel, LayoutResultCallback cb, Bundle extras) {
            if (cancel.isCanceled()) { cb.onLayoutCancelled(); return; }
            cb.onLayoutFinished(new PrintDocumentInfo.Builder(name).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(), true);
        }
        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor dest, CancellationSignal cancel, WriteResultCallback cb) {
            try (InputStream in = new FileInputStream(file); OutputStream out = new FileOutputStream(dest.getFileDescriptor())) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) {
                    if (cancel.isCanceled()) { cb.onWriteCancelled(); return; }
                    out.write(buf, 0, n);
                }
                cb.onWriteFinished(new PageRange[] { PageRange.ALL_PAGES });
            } catch (Exception e) { cb.onWriteFailed(e.getMessage()); }
        }
    }
}
