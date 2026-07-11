# syntax=docker/dockerfile:1
# Standalone haat-web-app repo — build from repository root:
#   docker build -t spacehaat-web .

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages packages
COPY index.html vite.config.js ./
COPY public public
COPY src src

RUN npm ci
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
