#!/bin/sh

git pull
echo "----Making sure parse tables are up to date..."
cd tools/extjs_cc
python3.3 js_cc.py 2> /dev/null
cd ../../

echo "----Executing build. . ."
python3.3 js_build.py

echo "----Restarting httpd. . ."
sudo /etc/init.d/httpd restart


