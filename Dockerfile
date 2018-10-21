#FROM softsky/kali-linux-full
FROM softsky/sn1per-docker

MAINTAINER Arsen A.Gutsal <a.gutsal@softsky.com.ua>

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.3.1
ENV NODE_ENV	 production
ENV NODE_PORT	 3001
ENV REPORT_PATH  /data

RUN apt-get update && apt-get upgrade -y --fix-missing

#RUN apt-get install -y tmux htop whatweb sqlmap nmap w3af skipfish nikto joomscan wpscan mc xsltproc ccze libswitch-perl sslscan python-pip && pip install droopescan
RUN apt-get install -y whatweb joomscan wpscan python-pip && pip install droopescan

RUN apt-get install curl locales -y
# Answering YES automatically to cpan
RUN perl -MCPAN -e 'my $c = "CPAN::HandleConfig"; $c->load(doit => 1, autoconfig => 1); $c->edit(prerequisites_policy => "follow"); $c->edit(build_requires_install_policy => "yes"); $c->commit' 
RUN cpan HTML::FromANSI

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.30.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

COPY *.json /app/

RUN cd /app \
    && . $NVM_DIR/nvm.sh \
    && npm install

RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen
RUN dpkg-reconfigure locales

ENV LANG en_US.UTF-8

VOLUME ["/data"]

EXPOSE 3001

COPY copyables /

# List of all ENV variables we're intent to use
ENV SCAN_DOMAIN none
ENV APILAYER_KEY none
ENV DOCKER_CONTAINER_NAME none

COPY *.js /app/
ADD sslcert /app/sslcert
COPY conf/*.js /app/conf/
COPY src/ /app/src/
COPY email-templates/ /app/email-templates/

# Seems other forms of CMD does not accept ENV variable

# CMD script -q -c "tmux start-server \; set-option -g default-terminal xterm \;\ 
#     	      	 new -s $(echo ${SCAN_DOMAIN}|sed -e s/\\\./_/g) \;\ 
# 		 new-window bash -c \"node /app/app.js\"" /dev/null

VOLUME "/tmp/.X11-unix:/tmp/.X11-unix"
VOLUME "/usr/share/sniper/loot:/home/archer/tmp/loot"
ENV DISPLAY $DISPLAY

CMD ["node", "/app/app.js"]
