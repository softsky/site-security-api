#!/bin/sh
tmux new htop
tmux new-window bash -c "nmap --script vuln -oX /data/nmap.xml $SCAN_DOMAIN"
tmux new-window bash -c "nikto -output /data/nikto.html -port 80,443 -host http://$SCAN_DOMAIN"
tmux new-window bash -c "wpscan --update;wpscan --follow-redirection -u $SCAN_DOMAIN | ansi2html >  /data/wordpress-0.html"
tmux new-window bash -c "joomscan -u $SCAN_DOMAIN | ansi2html > /data/wordpress-1.html"
tmux new-window bash -c "droopescan scan wordpress -u $SCAN_DOMAIN | ansi2html > /data/wordpress-1.html"
tmux new-window bash -c "droopescan scan drupal -u $SCAN_DOMAIN | ansi2html > /data/drupal.html"
tmux new-window bash -c "droopescan scan joomla -u $SCAN_DOMAIN | ansi2html > /data/joomla.html"
tmux new-window bash -c "skipfish -o /data/skipfish-$SCAN_DOMAIN http://$SCAN_DOMAIN"
tmux new-window bash -c "w3af -s /fast_scan.w3af"

