#!/bin/sh

git pull
cd js_build
python3.3 js_build.py
cd ..

