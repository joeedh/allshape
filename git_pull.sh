#!/bin/sh

git pull
echo "Executing build. . ."
python3.3 js_build.py
cd ..
sudo /etc/init.d/httpd restart


