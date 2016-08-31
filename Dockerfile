FROM kalilinux/kali-linux-docker

MAINTAINER Arsen A.Gutsal <gutsal.arsen@softsky.com.ua>

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.3.1
ENV NODE_ENV	 production
ENV NODE_PORT	 3001

RUN apt-get update && apt-get upgrade -y

RUN apt-get install -y tmux htop whatweb sqlmap nmap w3af skipfish nikto joomscan wpscan mc xsltproc ccze libswitch-perl sslscan python-pip && pip install droopescan

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

COPY *.json /site-security/

RUN cd /site-security \
    && . $NVM_DIR/nvm.sh \
    && npm install

RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen
RUN dpkg-reconfigure locales

ENV LANG en_US.UTF-8

VOLUME ["/data/reports"]

COPY *.js /site-security/
ADD sslcert /site-security/sslcert
COPY src/*.js /site-security/src/
COPY src/*.json /site-security/src/

EXPOSE 3001

COPY copyables /

CMD ["bash", "/init.sh"]
    
