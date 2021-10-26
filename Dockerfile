FROM us.gcr.io/spair-api/third-party/node:12.16-alpine as base

ARG NPM_TOKEN
RUN printf "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc

ENV NODE_DIR /home/node/app
WORKDIR $NODE_DIR

COPY /bundle .
RUN ls -a
EXPOSE 8080

CMD ["node", "main.js"]
