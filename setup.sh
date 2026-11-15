set -e
mkdir -p app/src/main/assets app/src/main/res/values app/src/main/res/drawable app/src/main/java/vn/flixtv/tv
cat > settings.gradle <<'FLIXEOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "FlixTV"
include ':app'
FLIXEOF
cat > build.gradle <<'FLIXEOF'
plugins { id 'com.android.application' version '8.7.3' apply false }
FLIXEOF
cat > gradle.properties <<'FLIXEOF'
org.gradle.jvmargs=-Xmx2g
android.useAndroidX=true
FLIXEOF
cat > app/build.gradle <<'FLIXEOF'
plugins { id 'com.android.application' }
android {
    namespace 'vn.flixtv.tv'
    compileSdk 34
    defaultConfig {
        applicationId 'vn.flixtv.tv'
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName '1.0'
    }
    buildTypes { release { minifyEnabled false } }
    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
}
FLIXEOF
cat > app/src/main/AndroidManifest.xml <<'FLIXEOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <application
        android:label="FlixTV"
        android:icon="@drawable/ic_launcher"
        android:banner="@drawable/banner"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.FlixTV"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboard|keyboardHidden|navigation|uiMode|screenLayout|smallestScreenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
FLIXEOF
cat > app/src/main/res/values/styles.xml <<'FLIXEOF'
<resources>
    <style name="Theme.FlixTV" parent="android:Theme.Material.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>
FLIXEOF
cat > app/src/main/res/drawable/ic_launcher.xml <<'FLIXEOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#000000" android:pathData="M0,0h108v108h-108z"/>
    <path android:fillColor="#0A7BFF" android:pathData="M54,54m-34,0a34,34 0,1 1,68 0a34,34 0,1 1,-68 0"/>
    <path android:fillColor="#FFFFFF" android:pathData="M46,38l24,16l-24,16z"/>
</vector>
FLIXEOF
cat > app/src/main/res/drawable/banner.xml <<'FLIXEOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="320dp" android:height="180dp" android:viewportWidth="320" android:viewportHeight="180">
    <path android:fillColor="#000000" android:pathData="M0,0h320v180h-320z"/>
    <path android:fillColor="#0A7BFF" android:pathData="M120,90m-30,0a30,30 0,1 1,60 0a30,30 0,1 1,-60 0"/>
    <path android:fillColor="#FFFFFF" android:pathData="M112,74l22,16l-22,16z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M165,78h8v24h-8z M178,78h26v6h-18v5h14v6h-14v7h-8z"/>
</vector>
FLIXEOF
cat > app/src/main/java/vn/flixtv/tv/MainActivity.java <<'FLIXEOF'
package vn.flixtv.tv;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    // Địa chỉ máy chủ FlixTV (server.js) để đăng nhập bằng QR, ví dụ "http://192.168.1.10:8080". Để trống = chế độ thử.
    private static final String SERVER_URL = "";

    private WebView web;
    private ValueCallback<Uri[]> fileCb;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try { startActivityForResult(Intent.createChooser(i, "Chọn ảnh"), 77); }
                catch (Exception e) { fileCb = null; cb.onReceiveValue(null); return false; }
                return true;
            }
        });
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        String q = SERVER_URL.isEmpty() ? "" : "?api=" + SERVER_URL;
        web.loadUrl("file:///android_asset/tv.html" + q);
        hideBars();
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) hideBars();
    }

    // Nút Back: để ứng dụng tự quay lại; ở trang chủ thì thoát.
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(function(){try{return (curView()==='home'&&document.getElementById('player').hidden&&document.getElementById('kb').hidden&&document.getElementById('auth').hidden)?'exit':'back';}catch(e){return 'exit';}})()", v -> {
            if (v != null && v.contains("back")) {
                web.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true}))", null);
            } else {
                finish();
            }
        });
    }

    @Override
    protected void onActivityResult(int rq, int rs, Intent d) {
        super.onActivityResult(rq, rs, d);
        if (rq == 77 && fileCb != null) {
            Uri[] r = (rs == RESULT_OK && d != null && d.getData() != null) ? new Uri[]{d.getData()} : null;
            fileCb.onReceiveValue(r);
            fileCb = null;
        }
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
FLIXEOF
test -f tv.html || { echo "Thiếu tv.html ở thư mục gốc repo"; exit 1; }
cp tv.html app/src/main/assets/tv.html
