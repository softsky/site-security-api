FROM softsky/kali-linux-full-docker

MAINTAINER Arsen A.Gutsal <gutsal.arsen@softsky.com.ua>

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.3.1
ENV NODE_ENV	 = production
ENV NODE_PORT	 = 3001

RUN apt-get install -y tmux

COPY package.json /site-security/
COPY src/*.js /site-security/src/

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.30.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN cd /site-security \
    && . $NVM_DIR/nvm.sh \
    && npm install

VOLUME ["/data/reports"]

EXPOSE 3001

COPY copyables /

CMD ["node", "/site-security/app.js"]
