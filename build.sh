#!/bin/sh
cd /root/cinder && npx esbuild src/main.js --bundle --minify --format=iife --loader:.json=json --outfile=/srv/site/cinder.js --log-level=warning && cp index.html /srv/site/index.html && echo built
