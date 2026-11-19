package io.github.jamie9904.lpnlog;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
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
   - takePending: a file opened or shared into the app, or a home-screen shortcut (Scan, Manifest check). */
@CapacitorPlugin(name = "LpnNative")
public class LpnNativePlugin extends Plugin {
    private static final long MAX_FILE = 40L * 1024 * 1024;
    private static JSObject pending = null;
    private static LpnNativePlugin current = null;
    private BarcodeScanner scanner = null;

    @Override
    public void load() {
        current = this;
    }

    /* Called by MainActivity for the intent that opened the app, and for later ones. */
    static void takeIntent(Activity activity, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if ("io.github.jamie9904.lpnlog.SCAN".equals(action)) { setPending(new JSObject().put("action", "scan")); return; }
        if ("io.github.jamie9904.lpnlog.MANIFEST".equals(action)) { setPending(new JSObject().put("action", "manifest")); return; }
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
