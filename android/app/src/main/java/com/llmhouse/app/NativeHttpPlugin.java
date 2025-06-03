package com.llmhouse.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 原生HTTP插件 - 绕过WebView的CORS限制
 * 专门用于MCP服务器通信
 */
@CapacitorPlugin(name = "NativeHttp")
public class NativeHttpPlugin extends Plugin {
    private static final String TAG = "NativeHttpPlugin";
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final java.util.Map<String, Future<?>> sseConnections = new java.util.concurrent.ConcurrentHashMap<>();

    @PluginMethod
    public void request(PluginCall call) {
        String url = call.getString("url");
        String method = call.getString("method", "GET");
        JSObject headers = call.getObject("headers", new JSObject());
        String body = call.getString("body");
        int timeout = call.getInt("timeout", 30000);

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        Log.d(TAG, "🌐 原生HTTP请求: " + method + " " + url);

        // 在后台线程执行网络请求
        executor.execute(() -> {
            try {
                JSObject result = performRequest(url, method, headers, body, timeout);
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "❌ 原生HTTP请求失败: " + e.getMessage(), e);
                call.reject("Request failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void connectSSE(PluginCall call) {
        String url = call.getString("url");
        String connectionId = call.getString("connectionId");
        JSObject headers = call.getObject("headers", new JSObject());

        if (url == null || connectionId == null) {
            call.reject("URL and connectionId are required");
            return;
        }

        Log.d(TAG, "🌐 原生SSE连接: " + url);

        // 停止现有连接（如果有）
        stopSSE(connectionId);

        // 启动新的SSE连接
        Future<?> future = executor.submit(() -> {
            try {
                performSSEConnection(url, connectionId, headers);
            } catch (Exception e) {
                Log.e(TAG, "❌ SSE连接失败: " + e.getMessage(), e);
                notifySSEError(connectionId, e.getMessage());
            }
        });

        sseConnections.put(connectionId, future);
        call.resolve();
    }

    @PluginMethod
    public void disconnectSSE(PluginCall call) {
        String connectionId = call.getString("connectionId");
        if (connectionId == null) {
            call.reject("connectionId is required");
            return;
        }

        stopSSE(connectionId);
        call.resolve();
    }

    private void stopSSE(String connectionId) {
        Future<?> future = sseConnections.remove(connectionId);
        if (future != null && !future.isDone()) {
            future.cancel(true);
            Log.d(TAG, "🔌 SSE连接已断开: " + connectionId);
        }
    }

    private void performSSEConnection(String urlString, String connectionId, JSObject headers) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        try {
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "text/event-stream");
            connection.setRequestProperty("Cache-Control", "no-cache");

            // 设置自定义请求头
            if (headers != null) {
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headers.getString(key);
                    if (value != null) {
                        connection.setRequestProperty(key, value);
                    }
                }
            }

            int responseCode = connection.getResponseCode();
            Log.d(TAG, "📥 SSE响应状态: " + responseCode);

            if (responseCode == 200) {
                // 通知连接成功
                notifySSEOpen(connectionId);

                // 读取SSE流
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                String line;
                StringBuilder eventData = new StringBuilder();
                String eventType = "message";

                while ((line = reader.readLine()) != null && !Thread.currentThread().isInterrupted()) {
                    if (line.isEmpty()) {
                        // 空行表示事件结束
                        if (eventData.length() > 0) {
                            notifySSEMessage(connectionId, eventType, eventData.toString());
                            eventData.setLength(0);
                            eventType = "message";
                        }
                    } else if (line.startsWith("data: ")) {
                        eventData.append(line.substring(6)).append('\n');
                    } else if (line.startsWith("event: ")) {
                        eventType = line.substring(7);
                    }
                    // 忽略其他SSE字段（id, retry等）
                }

                reader.close();
            } else {
                throw new IOException("SSE连接失败，状态码: " + responseCode);
            }

        } finally {
            connection.disconnect();
            notifySSEClose(connectionId);
        }
    }

    private void notifySSEOpen(String connectionId) {
        JSObject data = new JSObject();
        data.put("connectionId", connectionId);
        data.put("type", "open");
        notifyListeners("sseEvent", data);
    }

    private void notifySSEMessage(String connectionId, String eventType, String data) {
        JSObject eventData = new JSObject();
        eventData.put("connectionId", connectionId);
        eventData.put("type", "message");
        eventData.put("eventType", eventType);
        eventData.put("data", data.trim());
        notifyListeners("sseEvent", eventData);
    }

    private void notifySSEError(String connectionId, String error) {
        JSObject data = new JSObject();
        data.put("connectionId", connectionId);
        data.put("type", "error");
        data.put("error", error);
        notifyListeners("sseEvent", data);
    }

    private void notifySSEClose(String connectionId) {
        JSObject data = new JSObject();
        data.put("connectionId", connectionId);
        data.put("type", "close");
        notifyListeners("sseEvent", data);
    }

    private JSObject performRequest(String urlString, String method, JSObject headers, String body, int timeout) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            // 设置请求方法
            connection.setRequestMethod(method);
            
            // 设置超时
            connection.setConnectTimeout(timeout);
            connection.setReadTimeout(timeout);
            
            // 设置请求头
            if (headers != null) {
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headers.getString(key);
                    if (value != null) {
                        connection.setRequestProperty(key, value);
                        Log.d(TAG, "📋 设置请求头: " + key + " = " + value);
                    }
                }
            }
            
            // 设置请求体
            if (body != null && !body.isEmpty() && ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method))) {
                connection.setDoOutput(true);
                try (OutputStream os = connection.getOutputStream()) {
                    byte[] input = body.getBytes("utf-8");
                    os.write(input, 0, input.length);
                }
                Log.d(TAG, "📤 发送请求体: " + body.substring(0, Math.min(body.length(), 200)) + (body.length() > 200 ? "..." : ""));
            }
            
            // 获取响应
            int responseCode = connection.getResponseCode();
            String responseMessage = connection.getResponseMessage();
            
            Log.d(TAG, "📥 响应状态: " + responseCode + " " + responseMessage);
            
            // 读取响应体
            BufferedReader reader;
            if (responseCode >= 200 && responseCode < 300) {
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            } else {
                reader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            }
            
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line).append('\n');
            }
            reader.close();
            
            String responseBody = response.toString();
            Log.d(TAG, "📄 响应体长度: " + responseBody.length());
            
            // 获取响应头
            JSObject responseHeaders = new JSObject();
            for (String key : connection.getHeaderFields().keySet()) {
                if (key != null) {
                    String value = connection.getHeaderField(key);
                    responseHeaders.put(key, value);
                }
            }
            
            // 构建结果
            JSObject result = new JSObject();
            result.put("status", responseCode);
            result.put("statusText", responseMessage);
            result.put("data", responseBody);
            result.put("headers", responseHeaders);
            result.put("url", urlString);
            
            return result;
            
        } finally {
            connection.disconnect();
        }
    }
}
