FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package*.json /app/
COPY frontend/tsconfig*.json /app/
COPY frontend/vite.config.* /app/
COPY frontend/index.html /app/
COPY frontend/src /app/src

ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm install && npm run build

FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist /app/dist

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
