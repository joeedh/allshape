from logger import elog, mlog, alog
from mysql_db import mysql_connect, mysql_reconnect, get_qs, \
                     estr, valid_pass, SQLParamError, sql_selectall, \
                     sql_insertinto, do_param_error, sq, sql_update
import random, time, json, os, os.path, sys, math, types
from utils import *
from math import *
import datetime
from config import *

last_addon_check = time.time();
addon_check_interval = 500;
addons = None

def load_addons():
  global addons
  
  addons = []
  
  path = server_root + os.path.sep + ".." + os.path.sep + "addons";

  for f in os.listdir(path):
    path2 = path + os.path.sep + f
    if not os.path.isdir(path2): continue
    
    addons.append({
      "name" : f,
    })
  
def get_addons():
  global addons
  
  if addons == None or time.time() - last_addon_check > addon_check_interval:
    load_addons()
    
  return addons

mimemap = {
  "js"   : "application/x-javascript",
  "json" : "application/json",
  "html" : "text/html",
  "txt"  : "text/plain",
  "png"  : "image/png",
  "jpg"  : "image/jpeg",
  "tiff" : "image/tiff",
  "ico"  : "image/icon",
  "dcm"  : "application/dicom"
}

class AddonAPI_GetStaticFile:
  basepath = "/api/addon/file/get/"
  
  def __init__(self):
    pass
  
  def do_POST(self, serv):
    buf = serv.rfile.read()
    try:
      obj = json.loads(buf)
    except:
      self.send_error(401)
      return
    
    print(obj)
  
  def do_GET(self, serv):
    print(get_qs(serv.path))
    print("addon api access" + serv.path)
    
    path = serv.path[len(self.basepath):]
    
    path = server_root + os.path.sep + ".." + os.path.sep + "addons" + os.path.sep + path;
    path = os.path.abspath(os.path.normpath(path))
    
    if not os.path.exists(path):
      alog("Unknown file: " + path)
      serv.send_error(404)
    
    file = open(path, "rb")
    body = file.read()
    file.close()
    
    print("body length", len(body))
    
    mimetype = "text/plain"
    
    if "." in path:
      ext = path[path.rfind(".")+1:].replace(".", "").strip().lower()
      if ext in mimemap:
        mimetype = mimemap[ext]
    
    serv.gen_headers("GET", len(body), mimetype)
    
    csize = 1024
    i = 0;
    
    while i < len(body):
      serv.wfile.write(body[i:min(i+csize, len(body))])
      i += csize
    
class AddonAPI_List:
  basepath = "/api/addon/list"
  
  def __init__(self):
    pass
  
  def do_POST(self, serv):
    buf = serv.rfile.read()
    try:
      obj = json.loads(buf)
    except:
      self.send_error(401)
      return
    
    print(obj)
  
  def do_GET(self, serv):
    print(get_qs(serv.path))
    print("addon api access" + serv.path)
    
    qs = get_qs(serv.path)
    
    body = json.dumps(get_addons())
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(body)

class AddonAPI_Meta:
  basepath = "/api/addon/meta"
  
  def __init__(self):
    pass
  
  def do_POST(self, serv):
    buf = serv.rfile.read()
    try:
      obj = json.loads(buf)
    except:
      self.send_error(401)
      return
    
    print(obj)
  
  def do_GET(self, serv):
    print(get_qs(serv.path))
    print("fileapi access" + serv.path)
    
    qs = get_qs(serv.path)
    if "accessToken" not in qs or ("path" not in qs and "id" not in qs):
      serv.send_error(400)
      return
    
    body = json.dumps({})
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(body)
