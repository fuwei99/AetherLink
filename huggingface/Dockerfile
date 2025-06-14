# HuggingFace Spaces Dockerfile for AetherLink
FROM nginx:alpine

# 创建非root用户
RUN addgroup -g 1000 appuser && adduser -u 1000 -G appuser -s /bin/sh -D appuser

# 安装必要工具
RUN apk add --no-cache curl

# 创建必要的目录并设置权限
RUN mkdir -p /var/cache/nginx/client_temp \
    && mkdir -p /var/cache/nginx/proxy_temp \
    && mkdir -p /var/cache/nginx/fastcgi_temp \
    && mkdir -p /var/cache/nginx/uwsgi_temp \
    && mkdir -p /var/cache/nginx/scgi_temp \
    && mkdir -p /var/log/nginx \
    && mkdir -p /var/run \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appuser /var/cache/nginx \
    && chown -R appuser:appuser /var/log/nginx \
    && chown -R appuser:appuser /var/run/nginx.pid \
    && chown -R appuser:appuser /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制预构建的静态文件
COPY --chown=appuser:appuser dist /usr/share/nginx/html

# 切换到非root用户
USER appuser

# HuggingFace Spaces使用7860端口
EXPOSE 7860

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7860/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
