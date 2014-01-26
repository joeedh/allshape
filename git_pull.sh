#!/bin/sh

git pull
cd js_build
echo "Executing build. . ."
python3.3 js_build.py
cd ..

