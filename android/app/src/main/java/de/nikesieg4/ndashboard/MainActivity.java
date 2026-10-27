package de.nikesieg4.ndashboard;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;

/** Hülle um die Weboberfläche aus assets/ (gemeinsamer Ordner web/). */
public class MainActivity extends Activity {

    private static final int REQUEST_FILES = 1;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private volatile long updateDownloadId = -1;

    /** Ist die neue APK heruntergeladen, den Installieren-Dialog von Android öffnen. */
    private final BroadcastReceiver downloadDone = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id == -1 || id != updateDownloadId) {
                return;
            }
            updateDownloadId = -1;
            Uri apk = ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).getUriForDownloadedFile(id);
            if (apk == null) {
                Toast.makeText(MainActivity.this, "Update-Download fehlgeschlagen", Toast.LENGTH_LONG).show();
                return;
            }
            Intent install = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(apk, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(install);
            } catch (ActivityNotFoundException e) {
                Toast.makeText(MainActivity.this, "Kein Installer gefunden", Toast.LENGTH_LONG).show();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#121212"));
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new FileChooserClient());
        webView.addJavascriptInterface(new NativeBridge(), "NDNative");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);

        setContentView(webView);

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Die Meldung kommt vom System-DownloadManager, also von außerhalb der App
            registerReceiver(downloadDone, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(downloadDone, filter);
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl("file:///android_asset/index.html");
        }
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(downloadDone);
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        // Zurück-Taste blättert durch die Seiten der App (Hash-Navigation).
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** Dateiauswahl für <input type="file"> (Upload aufs NAS). */
    private class FileChooserClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(null);
            }
            fileCallback = callback;
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
            try {
                startActivityForResult(Intent.createChooser(intent, "Dateien auswählen"), REQUEST_FILES);
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_FILES || fileCallback == null) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i++) {
                    result[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                result = new Uri[] { data.getData() };
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    /** Von JavaScript aus erreichbar als window.NDNative. */
    private class NativeBridge {
        /**
         * Lädt eine Datei vom NAS über den System-DownloadManager in den Download-Ordner.
         * So gehen auch große Dateien (Videos) ohne Umweg über den Arbeitsspeicher.
         */
        @JavascriptInterface
        public boolean download(String url, String authorization, String name, String mimeType) {
            try {
                String safeName = name.replace('/', '_');
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                        .setTitle(safeName)
                        .setMimeType(mimeType)
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName);
                } else {
                    // Vor Android 10 bräuchte der öffentliche Ordner eine Speicher-Berechtigung
                    request.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, safeName);
                }
                if (authorization != null && !authorization.isEmpty()) {
                    request.addRequestHeader("Authorization", authorization);
                }
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, safeName + " wird in Downloads gespeichert", Toast.LENGTH_SHORT).show());
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /** Lädt die neue APK von GitHub; danach öffnet {@link #downloadDone} den Installieren-Dialog. */
        @JavascriptInterface
        public boolean installUpdate(String url, String versionName) {
            try {
                String name = "nDashboard-" + versionName.replaceAll("[^0-9A-Za-z._-]", "") + ".apk";
                File old = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name);
                if (old.exists()) {
                    old.delete();
                }
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                        .setTitle("nDashboard " + versionName)
                        .setMimeType("application/vnd.android.package-archive")
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                        .setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, name);
                updateDownloadId = ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Update wird heruntergeladen …", Toast.LENGTH_SHORT).show());
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}
