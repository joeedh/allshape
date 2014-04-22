#!/usr/bin/env bash

echo "--Checking for uncommitted changes. . ."
git commit -a
echo "--Pushing. . ."
git push
echo "--Executing build scripts on server. . ."
ssh app.all-shape.com 'cd ~/site; ./git_pull.sh'
echo "--Done"
