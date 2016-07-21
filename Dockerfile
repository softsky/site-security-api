FROM kalilinux/kali-linux-docker

MAINTAINER Arsen A.Gutsal <gutsal.arsen@softsky.com.ua>

ENV NODE_ENV	 = production
ENV NODE_PORT	 = 3001

RUN apt-get update && apt-get upgrade
RUN apt-get install nikto nmap whatweb

COPY package.json /site-security/
COPY src/*.js /site-security/src/

RUN wget -c ""
RUN source ~/.bashrc
RUN cd /site-security && npm install

COPY copyables /

VOLUME ["/tmp/reports"]

EXPOSE 3001

CMD ["node /site-security/app.js"]
