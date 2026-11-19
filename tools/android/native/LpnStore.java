package io.github.jamie9904.lpnlog;

import android.content.Context;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONArray;

/* The Android app's own storage for the page (android.js puts it in place of the browser's localStorage, which Android
   caps at about 10 MB). One file per key in the app's private folder, written safely (new file, then renamed), so a log
   can grow as large as the phone has room for. Only this app can read it; it's removed with the app's data. */
class LpnStore {
    private final File dir;
    private final Map<String, String> cache = new LinkedHashMap<>();

    LpnStore(Context ctx) {
        dir = new File(ctx.getFilesDir(), "lpnstore");
        if (!dir.exists()) dir.mkdirs();
        File[] files = dir.listFiles();
        if (files != null) for (File f : files) {
            if (!f.getName().endsWith(".v")) continue;
            try {
                String key = new String(Base64.decode(f.getName().substring(0, f.getName().length() - 2), Base64.URL_SAFE | Base64.NO_WRAP), StandardCharsets.UTF_8);
                cache.put(key, read(f));
            } catch (Exception ignored) {}
        }
    }

    private static String read(File f) throws Exception {
        try (FileInputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private File fileFor(String key) {
        return new File(dir, Base64.encodeToString(key.getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP) + ".v");
    }

    @JavascriptInterface
    public synchronized String get(String key) { return cache.get(key); }

    @JavascriptInterface
    public synchronized boolean set(String key, String value) {
        if (key == null || value == null) return false;
        File f = fileFor(key), tmp = new File(dir, f.getName() + ".tmp");
        try (FileOutputStream os = new FileOutputStream(tmp)) {
            os.write(value.getBytes(StandardCharsets.UTF_8));
            os.getFD().sync();
        } catch (Exception e) { tmp.delete(); return false; }
        if (!tmp.renameTo(f)) { tmp.delete(); return false; }
        cache.put(key, value);
        return true;
    }

    @JavascriptInterface
    public synchronized void remove(String key) { cache.remove(key); fileFor(key).delete(); }

    @JavascriptInterface
    public synchronized void clear() { for (String k : cache.keySet().toArray(new String[0])) remove(k); }

    @JavascriptInterface
    public synchronized String keys() { return new JSONArray(cache.keySet()).toString(); }

    /* Bytes used by everything stored. */
    @JavascriptInterface
    public synchronized long size() {
        long n = 0;
        for (Map.Entry<String, String> e : cache.entrySet()) n += e.getKey().length() + e.getValue().getBytes(StandardCharsets.UTF_8).length;
        return n;
    }

    /* Whether the data from before this storage (the browser's localStorage) has been copied in. */
    @JavascriptInterface
    public synchronized boolean migrated() { return new File(dir, "migrated").exists(); }

    @JavascriptInterface
    public synchronized void markMigrated() { try { new File(dir, "migrated").createNewFile(); } catch (Exception ignored) {} }
}
