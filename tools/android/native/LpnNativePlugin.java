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
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
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
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import android.content.BroadcastReceiver;
import android.graphics.Rect;
import android.provider.DocumentsContract;
import java.util.ArrayList;
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
   - "scanner": a Bluetooth or USB scanner (or keyboard) connecting or disconnecting;
   - vibrate: the page's buzzes (one short for added, a double for a warning) at full strength;
   - setBars: the status and navigation bars in the app's background colour, with dark icons on light colours;
   - tap: a light tap on the main buttons (Android's own keyboard-style feedback). */
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

    /* Live read manifest (TextScanActivity): numbers after "LPN:" come back as "textScan" events. */
    @PluginMethod
    public void startTextScan(PluginCall call) {
        getActivity().startActivity(new Intent(getActivity(), TextScanActivity.class).putExtra("target", call.getString("target", "manifest")));
        call.resolve();
    }

    @PluginMethod
    public void textScanStatus(PluginCall call) {
        TextScanActivity.show(call.getString("text"), call.getString("flash"), call.getString("recent", ""), Boolean.TRUE.equals(call.getBoolean("canUndo", false)), call.getString("forget"));
        call.resolve();
    }

    static void scanned(List<String> values) {
        if (current != null) current.notifyListeners("nativeScan", new JSObject().put("values", new JSArray(values)));
    }

    static void scanClosed(String reason) {
        if (current != null) current.notifyListeners("nativeScanClosed", new JSObject().put("reason", reason));
    }

    static void scanEvent(String name, JSObject data) {
        if (current != null) current.notifyListeners(name, data);
    }

    @PluginMethod
    public void scanStatus(PluginCall call) {
        JSObject st = call.getObject("state");
        if (st != null) {
            String[] cols = null;
            String cs = st.getString("colours"); // "#dba56c,#6fa8ff,#a9c95a,#c79bf0" for BB, FMCG, FPP, Mixed
            if (cs != null && cs.split(",").length == 4) cols = cs.split(",");
            ScanActivity.setState(st.getString("type"), Boolean.TRUE.equals(st.getBool("fsdu")), st.getString("recent"), Boolean.TRUE.equals(st.getBool("canUndo")), Boolean.TRUE.equals(st.getBool("big")), cols, Boolean.TRUE.equals(st.getBool("allIn")), st.getString("dcs"));
        }
        if (call.getString("dc") != null) ScanActivity.showDc(call.getString("dc"), "warn".equals(call.getString("flash")));
        if (call.getString("text") != null || call.getString("flash") != null || Boolean.TRUE.equals(call.getBoolean("close", false))) ScanActivity.show(call.getString("text"), Boolean.TRUE.equals(call.getBoolean("close", false)), call.getString("flash"));
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
    public void vibrate(PluginCall call) {
        JSArray p = call.getArray("pattern");
        try {
            int n = p == null ? 0 : p.length();
            if (n == 0) { call.resolve(); return; }
            long[] t = new long[n + 1];
            int[] amp = new int[n + 1];
            t[0] = 0; amp[0] = 0;
            for (int i = 0; i < n; i++) { t[i + 1] = Math.max(0, Math.min(1000, p.getLong(i))); amp[i + 1] = i % 2 == 0 ? 255 : 0; }
            Vibrator v = android.os.Build.VERSION.SDK_INT >= 31
                ? ((VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator()
                : (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) { call.resolve(); return; }
            if (android.os.Build.VERSION.SDK_INT >= 26) v.vibrate(v.hasAmplitudeControl() ? VibrationEffect.createWaveform(t, amp, -1) : VibrationEffect.createWaveform(t, -1));
            else v.vibrate(t, -1);
            call.resolve();
        } catch (Exception e) { call.resolve(); }
    }

    @PluginMethod
    public void setBars(PluginCall call) {
        final String colour = call.getString("colour", "#0c1830");
        final boolean light = Boolean.TRUE.equals(call.getBoolean("light", false));
        getActivity().runOnUiThread(() -> {
            try {
                int c = android.graphics.Color.parseColor(colour);
                getActivity().getWindow().getDecorView().setBackgroundColor(c);
                android.view.View content = getActivity().findViewById(android.R.id.content);
                if (content != null) content.setBackgroundColor(c);
                androidx.core.view.WindowInsetsControllerCompat bars = androidx.core.view.WindowCompat.getInsetsController(getActivity().getWindow(), getActivity().getWindow().getDecorView());
                bars.setAppearanceLightStatusBars(light);
                bars.setAppearanceLightNavigationBars(light);
                call.resolve();
            } catch (Exception e) { call.reject("bad colour"); }
        });
    }

    @PluginMethod
    public void tap(PluginCall call) {
        main.post(() -> { getBridge().getWebView().performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP); call.resolve(); });
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
        handheld(false);
        super.handleOnDestroy();
    }

    /* ---- Warehouse handheld scanners (Zebra and Honeywell): scans come straight to the app as an intent, instead of
       being typed like a keyboard. Zebra: a DataWedge profile for this app is made (or updated) that sends each scan
       to HW_ACTION and stops typing it. Honeywell: the scanner is claimed while the app is open, with its data sent
       to HW_ACTION. Elsewhere these broadcasts do nothing. */
    private static final String HW_ACTION = "io.github.jamie9904.lpnlog.HWSCAN";
    private boolean hwOn = false;
    private BroadcastReceiver hwRcv = null;

    @PluginMethod
    public void setHandheld(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        main.post(() -> { handheld(on); zebraProfile(on); call.resolve(); });
    }

    private void handheld(boolean on) {
        Context ctx = getContext();
        if (on && hwRcv == null) {
            hwRcv = new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent i) {
                    String code = null;
                    for (String k : new String[] { "com.symbol.datawedge.data_string", "data", "barcode_string", "barcodeData", "scannerdata" }) {
                        Object v = i.getExtras() == null ? null : i.getExtras().get(k);
                        if (v instanceof String && !((String) v).trim().isEmpty()) { code = ((String) v).trim(); break; }
                    }
                    if (code != null) notifyListeners("hwScan", new JSObject().put("code", code));
                }
            };
            // (Zebra sends it with the default category, Honeywell with none: an intent with no category always matches)
            IntentFilter f = new IntentFilter(HW_ACTION); f.addCategory(Intent.CATEGORY_DEFAULT);
            ContextCompat.registerReceiver(ctx, hwRcv, f, ContextCompat.RECEIVER_EXPORTED);
        }
        if (!on && hwRcv != null) { try { ctx.unregisterReceiver(hwRcv); } catch (Exception e) {} hwRcv = null; }
        hwOn = on;
        honeywell(on);
    }

    private void honeywell(boolean claim) {
        try {
            Intent i = new Intent(claim ? "com.honeywell.aidc.action.ACTION_CLAIM_SCANNER" : "com.honeywell.aidc.action.ACTION_RELEASE_SCANNER")
                .setPackage("com.intermec.datacollectionservice");
            if (claim) {
                Bundle props = new Bundle();
                props.putBoolean("DPR_DATA_INTENT", true);
                props.putString("DPR_DATA_INTENT_ACTION", HW_ACTION);
                i.putExtra("com.honeywell.aidc.extra.EXTRA_SCANNER", "dcs.scanner.imager")
                 .putExtra("com.honeywell.aidc.extra.EXTRA_PROFILE", "DEFAULT")
                 .putExtra("com.honeywell.aidc.extra.EXTRA_PROPERTIES", props);
            }
            getContext().sendBroadcast(i);
        } catch (Exception e) {}
    }

    private void zebraProfile(boolean on) {
        try {
            Bundle profile = new Bundle();
            profile.putString("PROFILE_NAME", "LPN Pallet Log");
            profile.putString("PROFILE_ENABLED", "true");
            profile.putString("CONFIG_MODE", "CREATE_IF_NOT_EXIST");
            Bundle app = new Bundle();
            app.putString("PACKAGE_NAME", getContext().getPackageName());
            app.putStringArray("ACTIVITY_LIST", new String[] { "*" });
            profile.putParcelableArray("APP_LIST", new Bundle[] { app });
            ArrayList<Bundle> plugins = new ArrayList<>();
            Bundle bc = new Bundle(); bc.putString("PLUGIN_NAME", "BARCODE"); bc.putString("RESET_CONFIG", "false");
            Bundle bcp = new Bundle(); bcp.putString("scanner_selection", "auto"); bcp.putString("scanner_input_enabled", "true"); bc.putBundle("PARAM_LIST", bcp); plugins.add(bc);
            Bundle in = new Bundle(); in.putString("PLUGIN_NAME", "INTENT"); in.putString("RESET_CONFIG", "true");
            Bundle inp = new Bundle(); inp.putString("intent_output_enabled", on ? "true" : "false"); inp.putString("intent_action", HW_ACTION);
            inp.putString("intent_category", Intent.CATEGORY_DEFAULT); inp.putString("intent_delivery", "2"); in.putBundle("PARAM_LIST", inp); plugins.add(in);
            Bundle ks = new Bundle(); ks.putString("PLUGIN_NAME", "KEYSTROKE"); ks.putString("RESET_CONFIG", "true");
            Bundle ksp = new Bundle(); ksp.putString("keystroke_output_enabled", on ? "false" : "true"); ks.putBundle("PARAM_LIST", ksp); plugins.add(ks);
            profile.putParcelableArrayList("PLUGIN_CONFIG", plugins);
            getContext().sendBroadcast(new Intent("com.symbol.datawedge.api.ACTION").putExtra("com.symbol.datawedge.api.SET_CONFIG", profile));
        } catch (Exception e) {}
    }

    @Override
    protected void handleOnPause() {
        if (hwOn) honeywell(false); // let other apps use the Honeywell scanner while this one is in the background
        super.handleOnPause();
    }

    /* ---- Silent mode: whether the phone is on silent, vibrate or Do Not Disturb, so scan sounds can follow it. The
       page is told when it changes. */
    private BroadcastReceiver ringRcv = null;

    private boolean silenced() {
        Context ctx = getContext();
        android.media.AudioManager am = (android.media.AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        boolean quiet = am != null && am.getRingerMode() != android.media.AudioManager.RINGER_MODE_NORMAL;
        android.app.NotificationManager nm = (android.app.NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && nm.getCurrentInterruptionFilter() > android.app.NotificationManager.INTERRUPTION_FILTER_ALL) quiet = true;
        return quiet;
    }

    @PluginMethod
    public void ringer(PluginCall call) {
        if (ringRcv == null) {
            ringRcv = new BroadcastReceiver() { @Override public void onReceive(Context c, Intent i) { notifyListeners("ringer", new JSObject().put("silent", silenced())); } };
            IntentFilter f = new IntentFilter(android.media.AudioManager.RINGER_MODE_CHANGED_ACTION);
            f.addAction(android.app.NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED);
            ContextCompat.registerReceiver(getContext(), ringRcv, f, ContextCompat.RECEIVER_NOT_EXPORTED);
        }
        call.resolve(new JSObject().put("silent", silenced()));
    }

    /* ---- Manifest photos read by ML Kit's text reader on the phone (no internet): the words with their boxes, in the
       photo's own pixels, so the page's photo reading (close-ups, tidy-up, prefix list) works as with its own reader. */
    private TextRecognizer textReader = null;

    @PluginMethod
    public void readText(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("no image"); return; }
        Bitmap bmp;
        try { byte[] bytes = Base64.decode(data, Base64.DEFAULT); bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length); }
        catch (Exception e) { call.reject("image couldn’t be read"); return; }
        if (bmp == null) { call.reject("image couldn’t be read"); return; }
        if (textReader == null) textReader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        final Bitmap b = bmp;
        textReader.process(InputImage.fromBitmap(b, 0))
            .addOnSuccessListener(t -> {
                JSArray words = new JSArray();
                for (Text.TextBlock bl : t.getTextBlocks()) for (Text.Line ln : bl.getLines()) for (Text.Element el : ln.getElements()) {
                    Rect r = el.getBoundingBox(); if (r == null) continue;
                    words.put(new JSObject().put("text", el.getText()).put("x0", r.left).put("y0", r.top).put("x1", r.right).put("y1", r.bottom)
                        .put("line", ln.getText()));
                }
                b.recycle();
                call.resolve(new JSObject().put("text", t.getText()).put("words", words));
            })
            .addOnFailureListener(e -> { b.recycle(); call.reject(e.getMessage() == null ? "text reader failed" : e.getMessage()); });
    }

    /* ---- A notification when something finished while the app was in the background (manifest photos read).
       Tapping it opens the app on the Manifest check. Android 13+ asks once for permission to show notifications. */
    private static final String CHANNEL = "done";

    @PluginMethod
    public void notify(PluginCall call) {
        Context ctx = getContext();
        try {
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                android.app.NotificationManager nm = ctx.getSystemService(android.app.NotificationManager.class);
                if (nm.getNotificationChannel(CHANNEL) == null)
                    nm.createNotificationChannel(new android.app.NotificationChannel(CHANNEL, "Finished in the background", android.app.NotificationManager.IMPORTANCE_DEFAULT));
            }
            if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                call.resolve(new JSObject().put("shown", false).put("allowed", false)); return;
            }
            Intent open = new Intent("io.github.jamie9904.lpnlog.MANIFEST").setClassName(ctx, MainActivity.class.getName()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(ctx, 1, open, android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT);
            androidx.core.app.NotificationCompat.Builder b = new androidx.core.app.NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(ctx.getApplicationInfo().icon).setContentTitle(call.getString("title", "LPN Pallet Log"))
                .setContentText(call.getString("text", "")).setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(call.getString("text", "")))
                .setContentIntent(pi).setAutoCancel(true);
            androidx.core.app.NotificationManagerCompat.from(ctx).notify(1, b.build());
            call.resolve(new JSObject().put("shown", true).put("allowed", true));
        } catch (SecurityException e) { call.resolve(new JSObject().put("shown", false).put("allowed", false)); }
        catch (Exception e) { call.reject(e.getMessage() == null ? "notification failed" : e.getMessage()); }
    }

    /* Asks for permission to show notifications (Android 13+), once, when it's first useful. */
    @PluginMethod
    public void askNotify(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            call.resolve(new JSObject().put("allowed", true)); return;
        }
        getActivity().requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7341);
        call.resolve(new JSObject().put("asked", true));
    }

    /* ---- A folder chosen once (for example a synced OneDrive or Google Drive folder): every export also goes there. */
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "pickFolderDone");
    }

    @ActivityCallback
    private void pickFolderDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(new JSObject().put("picked", false)); return; }
        Uri tree = result.getData().getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            call.resolve(new JSObject().put("picked", true).put("uri", tree.toString()).put("name", treeName(tree)));
        } catch (Exception e) { call.reject(e.getMessage() == null ? "That folder can’t be used." : e.getMessage()); }
    }

    private String treeName(Uri tree) {
        try {
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            try (Cursor c = getContext().getContentResolver().query(doc, new String[] { DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
                if (c != null && c.moveToFirst()) return c.getString(0);
            }
        } catch (Exception e) {}
        return "the chosen folder";
    }

    @PluginMethod
    public void saveToFolder(PluginCall call) {
        String uri = call.getString("uri"), name = call.getString("name", "file"), data = call.getString("data"), mime = call.getString("mime", "application/octet-stream");
        if (uri == null || data == null) { call.reject("no folder"); return; }
        try {
            Uri tree = Uri.parse(uri);
            String treeId = DocumentsContract.getTreeDocumentId(tree);
            Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, treeId);
            // The same name again (an export made twice) replaces the older copy instead of adding "(1)".
            Uri target = null;
            try (Cursor c = getContext().getContentResolver().query(DocumentsContract.buildChildDocumentsUriUsingTree(tree, treeId),
                    new String[] { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
                while (c != null && c.moveToNext()) if (name.equals(c.getString(1))) { target = DocumentsContract.buildDocumentUriUsingTree(tree, c.getString(0)); break; }
            }
            if (target == null) target = DocumentsContract.createDocument(getContext().getContentResolver(), parent, mime, name);
            if (target == null) { call.reject("The file couldn’t be made in that folder."); return; }
            try (OutputStream os = getContext().getContentResolver().openOutputStream(target, "wt")) { os.write(Base64.decode(data, Base64.DEFAULT)); }
            call.resolve(new JSObject().put("saved", true).put("folder", treeName(tree)));
        } catch (SecurityException e) { call.reject("This app can’t reach that folder any more. Choose it again in Settings."); }
        catch (Exception e) { call.reject(e.getMessage() == null ? "The file couldn’t be saved there." : e.getMessage()); }
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
        if (hwOn) honeywell(true);
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
        // Used by the screenshot check on GitHub (tools/android/shots.sh) to open a screen: settings, carry, big-on, big-off.
        if ("io.github.jamie9904.lpnlog.SHOW".equals(action)) { String w = intent.getStringExtra("what"); setPending(new JSObject().put("action", "show").put("what", w == null ? "" : w)); return; }
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

    /* Email PDF: the file (saved in the app's cache by the page) goes to an email app with the To address filled in. */
    @PluginMethod
    public void emailFile(PluginCall call) {
        String uri = call.getString("uri"), to = call.getString("to", ""), subject = call.getString("subject", ""), text = call.getString("text", ""), mime = call.getString("mime", "application/pdf");
        try {
            File f = new File(Uri.parse(uri).getPath());
            String cache = getContext().getCacheDir().getCanonicalPath() + File.separator;
            if (!f.getCanonicalPath().startsWith(cache) || !f.exists()) { call.reject("That file is no longer there."); return; }
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, u).putExtra(Intent.EXTRA_SUBJECT, subject).putExtra(Intent.EXTRA_TEXT, text).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (to != null && !to.isEmpty()) i.putExtra(Intent.EXTRA_EMAIL, new String[] { to });
            i.setClipData(android.content.ClipData.newRawUri("", u));
            // Only email apps (the mailto: selector); if the phone has none set up that way, any app that can send it.
            Intent only = new Intent(i).setSelector(new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:")));
            try { getActivity().startActivity(only); }
            catch (android.content.ActivityNotFoundException e) { getActivity().startActivity(Intent.createChooser(i, "Email " + f.getName())); }
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage() == null ? "No email app on this phone could open it." : e.getMessage()); }
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
