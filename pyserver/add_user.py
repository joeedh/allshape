#!/usr/bin/env python2
import os, sys, os.path, subprocess, shlex, shutil, json
import hashlib, base64, random, math, time  
from smtplib import *
import smtplib

# Here are the email package modules we'll need
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

words = [
  "quick",
  "mango",
  "word",
  "lite",
  "fun",
  "banner",
  "red",
  "blue",
  "orange",
  "purple",
  "iron",
  "boring",
  "book",
  "learn",
  "kill",
  "bed",
  "blanket",
  "color",
  "music",
  "sheet",
  "line",
  "one",
  "page",
  "eight",
  "ball"
]

if len(sys.argv) < 2:
  sys.stderr.write("usage: add_user.py json_data\n")
  sys.exit(-1)

data = sys.argv[1]
if data.endswith(";"): data = data[:len(data)-1]
print("\n"+data+"\n\n")
data = data.strip().replace("'", "\"")

try:
  obj = json.loads(data);
except RuntimeError: #ValueError:
  sys.stderr.write("Error: \"%s\"\n"%data);
  sys.stderr.write("Parse error in input\n")
  sys.exit(-1)

from mysql_db import *
from auth import default_permission

_range_repeat = set()
def rand_range(length, range1):
  global _range_repeat
  
  if type(length) in [str, set, dict, list, tuple]:
    length = len(length)
  
  i = 0
  while i < 1000:
    ret = tuple([rand_idx(length) for j in range(range1)])
    if ret not in _range_repeat: break
    i += 1
    
  if ret == _range_repeat:
    sys.stderr.write("warning: repeats in rand_range")
    _range_repeat = set()
  
  _range_repeat.add(ret)
  
  return ret
  
_rand_repeats = set()
def rand_idx(length):
  global _rand_repeats
  
  rmap = _rand_repeats;
  if type(length) in [str, list, dict, set, tuple]:
    length = len(length)
  
  ret = int(random.random()*length*0.999999999);
  
  i = 0
  while ret in rmap:
    ret = int(random.random()*length*0.999999999);
    if i > length*2: break #we failed to find a unique index
    i += 1
  
  if ret in rmap: #didn't find a free index; reset map
    _rand_repeats = rmap = set()
  
  rmap.add(ret)
  return ret

def reseed(seed_inc):
  time.sleep(0.01)
  random.seed(int(time.time()*1000)+seed_inc)
  random.seed(random.random()+seed_inc)
  
  #seed_inc += 1
  
  #time.sleep(0.04*random.random())
  #random.seed(int(time.time()*1000)+seed_inc)
  #random.seed(random.random()+seed_inc)
  
  return seed_inc + 1
     
def gen_password():
  global words

  seed_inc = reseed(0)
  
  i1, i2 = rand_range(words, 2);
  
  bstr = "123456789abcdefghijklmnpqrstuvwkyz"
  s = words[i1] + words[i2] 
  
  for i in range(5):
    c = bstr[int(random.random()*len(bstr)*0.9999999)]
    s += c.upper()
  return s
  

def main(obj):
  cur, con = mysql_connect()
  
  def test_field(field, val, ftype):
    qstr = sql_selectall("users", [field], [val], [ftype])
    cur.execute(qstr);
    return cur.fetchone() != None
  
  if test_field("email", obj["email"], sq.str(255)):
    sys.stderr.write("Error: email " + obj.email + " already in use\n");
    sys.exit(-1);
  
  i = -1;
  while test_field("username", obj["username"] + (str(i) if i > 0 else ""), sq.user):
    i += 1
  
  if i != -1: obj["username"] += str(i)
  
  if "password" not in obj:
    password = gen_password()
    obj["password"] = password
  
  p = obj["password"]

  sha = hashlib.sha1()
  sha.update(p)
  p = "{SHA}" + base64.b64encode(sha.digest())
 
  print(p)
  qstr = sql_insertinto("users", 
                        ["username",      "email",      "name_first", "name_last", "permissions",      "password"],
                        [obj["username"], obj["email"], obj["first"], obj["last"], default_permission, p],
                        [sq.user,         sq.str(255),  sq.str(255),  sq.str(255), sq.int,             sq.passw])
  
  def rename_key(obj, key, n):
    val = obj[key]
    del obj[key]
    obj[n] = val
  
  rename_key(obj, "last", "name_last")
  rename_key(obj, "first", "name_first")
  
  #XXX
  obj["email"] = "joeedh@gmail.com"
  
  msg = MIMEMultipart()
  msg["Subject"] = "Acceptance into All-Shape Beta"
  msg["From"] = "joeedh@all-shape.com"
  msg["To"] = obj["email"]
  msg.preamble = """Welcome to the All-Shape beta.
  
  Below is your user information, including an
  auto-generated password.  To log into All-Shape,
  go to http://app.all-shape.com/site3d
    
  First Name: %s
  Last Name: %s
  Password: %s
  Username: %s
  Email: %s
  
  Your account will also give you access to other parts of All-Shape.com, as they
  come online.
  """ % (obj["name_first"], obj["name_last"], obj["password"], obj["username"], obj["email"])
  
  for k in obj:
    print("  %s: %s" % (k, obj[k]))
  
  # Send the email via our own SMTP server.
  s = smtplib.SMTP('localhost')
  s.sendmail("joeedh@all-shape.com", obj["email"], msg.as_string())
  s.quit()
  
main(obj)
  
def test_gen_password():
  print(data)
  
  repeat = {}
  for i in range(1000):
    ret = gen_password()
    if ret not in repeat:
      repeat[ret] = 1
    else:
      repeat[ret] += 1;
    
    for r in repeat:
      if repeat[r] > 1:
        print(r, repeat[r], i)
    print(ret)
    #print(int(time.time()*1000))    

def test_rand_range():
  si = 0
  steps = 9
  
  repeats = {}
  for i in range(200):
    arr = rand_range(steps, 2)
    #print(arr)
    if arr not in repeats:
      repeats[arr] = 1
    else:
      repeats[arr] += 1
    
    for k in repeats:
      if repeats[k] > 1:
        print(list(k), repeats[k], i)
