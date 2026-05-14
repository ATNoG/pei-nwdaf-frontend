FROM nginx:alpine

RUN apk add --no-cache openssl

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/templates/default.conf.template

RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/selfsigned.key \
      -out /etc/nginx/ssl/selfsigned.crt \
      -subj "/CN=localhost" && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
