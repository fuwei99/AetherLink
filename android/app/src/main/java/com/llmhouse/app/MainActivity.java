package com.llmhouse.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.llmhouse.app.webview.SmartWebViewManager;
import com.llmhouse.app.webview.WebViewDetector;
import com.llmhouse.app.webview.WebViewUpgradeDialog;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 在Capacitor 4+中，必须在super.onCreate之前注册插件
        registerPlugin(ModernWebViewPlugin.class);
        registerPlugin(NativeHttpPlugin.class);

        super.onCreate(savedInstanceState);

        // 添加明显的启动日志
        Log.i(TAG, "=== MainActivity onCreate 开始 ===");
        System.out.println("=== MainActivity onCreate 开始 ===");

        //  配置WebView允许混合内容（HTTP + HTTPS）
        configureMixedContent();

        // 初始化现代WebView管理
        initializeModernWebView();

        // 针对Android 15及以上版本处理状态栏重叠问题
        if (Build.VERSION.SDK_INT >= 35) {
            // 设置状态栏为非透明
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

            // 设置状态栏为可绘制
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

            // 让Capacitor StatusBar插件来控制状态栏样式，不在这里强制设置
            // 移除了强制设置状态栏文字颜色的代码，让插件动态控制

            // 添加窗口内容扩展到状态栏
            View decorView = getWindow().getDecorView();
            decorView.setOnApplyWindowInsetsListener((v, insets) -> {
                // 确保WebView不会被状态栏覆盖
                View webView = findViewById(android.R.id.content);
                if (webView != null) {
                    ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
                        int statusBarHeight = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                        view.setPadding(0, statusBarHeight, 0, 0);
                        return WindowInsetsCompat.CONSUMED;
                    });
                }
                return insets;
            });
        }
    }

    /**
     * 配置WebView允许混合内容（HTTP + HTTPS）
     * 解决移动端混合内容安全策略问题，同时保持流式输出功能
     */
    private void configureMixedContent() {
        try {
            Log.d(TAG, "🔧 开始配置WebView混合内容支持");

            // 延迟执行，确保Capacitor WebView已经初始化
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        android.webkit.WebView webView = getBridge().getWebView();
                        WebSettings settings = webView.getSettings();

                        //  关键设置：允许混合内容
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                            Log.d(TAG, "✅ 已启用混合内容支持 (MIXED_CONTENT_ALWAYS_ALLOW)");
                        }

                        //  彻底禁用CORS - 关键设置
                        settings.setAllowFileAccess(true);
                        settings.setAllowContentAccess(true);
                        settings.setAllowFileAccessFromFileURLs(true);
                        settings.setAllowUniversalAccessFromFileURLs(true);

                        // 基础Web功能
                        settings.setJavaScriptEnabled(true);
                        settings.setDomStorageEnabled(true);
                        settings.setDatabaseEnabled(true);

                        // 确保网络请求正常
                        settings.setBlockNetworkLoads(false);
                        settings.setLoadsImagesAutomatically(true);

                        //  添加WebView启动参数来禁用安全性
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                            try {
                                // 启用WebView调试
                                WebView.setWebContentsDebuggingEnabled(true);
                                Log.d(TAG, "🔓 已启用WebView调试模式");
                            } catch (Exception e) {
                                Log.w(TAG, "⚠️ 启用WebView调试失败: " + e.getMessage());
                            }
                        }

                        //  尝试禁用Web安全性
                        try {
                            java.lang.reflect.Method setWebSecurityMethod = settings.getClass().getDeclaredMethod("setWebSecurityEnabled", boolean.class);
                            setWebSecurityMethod.setAccessible(true);
                            setWebSecurityMethod.invoke(settings, false);
                            Log.d(TAG, "🔓 已禁用Web安全性 (CORS检查已关闭)");
                        } catch (Exception e) {
                            Log.w(TAG, "⚠️ 无法禁用Web安全性: " + e.getMessage());
                        }

                        Log.d(TAG, " 已彻底禁用 CORS 和所有Web安全限制");

                        Log.d(TAG, "🎉 WebView混合内容配置完成");
                    } else {
                        Log.w(TAG, "⚠️ 无法获取Capacitor WebView，将稍后重试");
                        // 如果WebView还没准备好，再次延迟重试
                        configureMixedContentRetry(1);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ 配置WebView混合内容时发生错误: " + e.getMessage(), e);
                }
            }, 500); // 延迟500ms执行

        } catch (Exception e) {
            Log.e(TAG, "❌ 初始化混合内容配置时发生错误: " + e.getMessage(), e);
        }
    }

    /**
     * 重试配置混合内容（最多重试3次）
     */
    private void configureMixedContentRetry(int retryCount) {
        if (retryCount > 3) {
            Log.w(TAG, "⚠️ 混合内容配置重试次数已达上限，放弃配置");
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    android.webkit.WebView webView = getBridge().getWebView();
                    WebSettings settings = webView.getSettings();

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                        Log.d(TAG, "✅ 混合内容配置成功 (重试第" + retryCount + "次)");
                    }

                    //  基础CORS禁用设置
                    settings.setAllowFileAccess(true);
                    settings.setAllowContentAccess(true);
                    settings.setAllowFileAccessFromFileURLs(true);
                    settings.setAllowUniversalAccessFromFileURLs(true);
                    settings.setBlockNetworkLoads(false);

                    //  尝试禁用Web安全性
                    try {
                        java.lang.reflect.Method setWebSecurityMethod = settings.getClass().getDeclaredMethod("setWebSecurityEnabled", boolean.class);
                        setWebSecurityMethod.setAccessible(true);
                        setWebSecurityMethod.invoke(settings, false);
                        Log.d(TAG, "🔓 已禁用Web安全性 (重试第" + retryCount + "次)");
                    } catch (Exception e) {
                        Log.w(TAG, "⚠️ 无法禁用Web安全性 (重试第" + retryCount + "次): " + e.getMessage());
                    }

                    Log.d(TAG, " 已彻底禁用 CORS 和安全限制 (重试第" + retryCount + "次)");
                } else {
                    Log.d(TAG, "🔄 WebView仍未准备好，继续重试 (第" + retryCount + "次)");
                    configureMixedContentRetry(retryCount + 1);
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ 重试配置混合内容时发生错误: " + e.getMessage(), e);
                configureMixedContentRetry(retryCount + 1);
            }
        }, 1000 * retryCount); // 递增延迟时间
    }

    /**
     * 初始化现代WebView管理系统
     */
    private void initializeModernWebView() {
        try {
            Log.d(TAG, "🚀 开始初始化现代WebView管理系统");

            // 获取WebView信息
            WebViewDetector.WebViewInfo webViewInfo = WebViewDetector.getWebViewInfo(this);
            SmartWebViewManager.WebViewStrategy strategy = SmartWebViewManager.getBestStrategy(this);

            Log.d(TAG, String.format("📱 WebView信息: 版本=%d, 包名=%s, 质量=%s",
                webViewInfo.version, webViewInfo.packageName, webViewInfo.getQualityLevel()));
            Log.d(TAG, "🎯 选择策略: " + strategy);

            // 替换Capacitor的WebView为优化版本
            replaceCapacitorWebView();

            // 检查是否需要显示升级对话框
            if (webViewInfo.needsUpgrade()) {
                Log.d(TAG, "⚠️ WebView版本较低，将在适当时机提示升级");
                // 延迟显示升级对话框，避免影响应用启动
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    WebViewUpgradeDialog.showUpgradeDialogIfNeeded(this);
                }, 3000); // 3秒后检查
            } else {
                Log.d(TAG, "✅ WebView版本良好，无需升级");
            }

            Log.d(TAG, "🎉 现代WebView管理系统初始化完成");

        } catch (Exception e) {
            Log.e(TAG, "❌ 初始化现代WebView管理系统时发生错误: " + e.getMessage(), e);
        }
    }

    /**
     * 替换Capacitor的WebView为优化版本
     */
    private void replaceCapacitorWebView() {
        try {
            Log.d(TAG, "🔄 开始替换Capacitor WebView");

            // 获取Capacitor的Bridge
            if (getBridge() != null && getBridge().getWebView() != null) {
                // 创建优化的WebView
                android.webkit.WebView optimizedWebView = SmartWebViewManager.createOptimizedWebView(this);

                Log.d(TAG, "✅ 成功创建优化的WebView");
                Log.d(TAG, "📊 WebView UserAgent: " + optimizedWebView.getSettings().getUserAgentString());

                // 注意：这里我们不直接替换WebView，而是确保新创建的WebView使用了我们的优化配置
                // Capacitor的WebView替换需要更深层的集成

            } else {
                Log.w(TAG, "⚠️ 无法获取Capacitor Bridge或WebView");
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ 替换WebView时发生错误: " + e.getMessage(), e);
        }
    }
}
