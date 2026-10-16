# Dashboard (Node) + modelo Random Forest (Python) en un solo servicio.
# Python 3.13 y las versiones de tesis-rf/requirements.txt son las del entrenamiento.
FROM node:22-bookworm-slim AS node

FROM python:3.13-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app
COPY tesis-rf/requirements.txt tesis-rf/requirements.txt
RUN pip install --no-cache-dir -r tesis-rf/requirements.txt

COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

ENV NODE_ENV=production PYTHON=python3 PYTHONDONTWRITEBYTECODE=1
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
