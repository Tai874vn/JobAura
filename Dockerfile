FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=jobaura-frontend-npm,target=/root/.npm,sharing=locked npm ci --no-audit --no-fund

FROM deps AS builder

ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ARG NEXT_PUBLIC_USE_SAME_ORIGIN_API=true
ARG NEXT_PUBLIC_IMAGE_HOSTS=res.cloudinary.com,images.unsplash.com,i.pravatar.cc,lh3.googleusercontent.com
ARG BACKEND_API_BASE_URL=http://backend:3002
ARG CSP_ENFORCE_STRICT=false
ARG CSP_REPORT_ONLY=true

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_USE_SAME_ORIGIN_API=$NEXT_PUBLIC_USE_SAME_ORIGIN_API
ENV NEXT_PUBLIC_IMAGE_HOSTS=$NEXT_PUBLIC_IMAGE_HOSTS
ENV BACKEND_API_BASE_URL=$BACKEND_API_BASE_URL
ENV CSP_ENFORCE_STRICT=$CSP_ENFORCE_STRICT
ENV CSP_REPORT_ONLY=$CSP_REPORT_ONLY
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN mkdir -p public
RUN --mount=type=cache,id=jobaura-frontend-next,target=/app/.next/cache npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BACKEND_API_BASE_URL=http://backend:3002
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

USER node

CMD ["node", "server.js"]
