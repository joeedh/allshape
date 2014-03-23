from logger import elog, mlog, alog
import os, sys, os.path, math, random, time, io, gc
import shelve, imp, struct, ctypes, ply
import mimetypes
from auth import AuthAPI_RefreshToken_WPHack, AuthAPI_OAuthStart, AuthAPI_GetUserInfo, AuthAPI_RefreshToken, AuthAPI_SessionToken
from fileapi import FileAPI_DirList, FileAPI_GetMeta, FileAPI_UploadStart, FileAPI_UploadChunk, FileAPI_GetFile
import config, json
from config import *
from mysql_db import mysql_close_connections

import pymysql.err
from api import api_handlers

def bstr_py3(s):
  if type(s) == bytes: return s
  else: return bytes(str(s), "ascii")
  
def bstr_py2(s):
  return str(s)
  
import sys
if not WITH_PY2:
  from io import StringIO
  bstr = bstr_py3
else:
  from StringIO import StringIO
  bstr = bstr_py2

def Header_WSGI2HTTP(h):
  h = h.replace("-", "_")
  h = h.lower().split("_")
  h2 = ""
  ilen = len(h)
  
  for i, s in enumerate(h):
    if i != 0: h2 += "-"
    
    h2 += s[0].upper() + s[1:]
    
  return h2
    
class WSGIServerBridge:
  def __init__(self, environ):
    self.headers = {}
    self.res_headers = {}
    self.code = 200
    self.codemsg = "OK"
    
    for k in environ:
      if k.startswith("HTTP_"):
        k2 = Header_WSGI2HTTP(k[5:])
        self.headers[k2] = environ[k]
    
    self.method = environ["REQUEST_METHOD"]
    self.path = environ["REQUEST_URI"]
    self.query = environ["QUERY_STRING"]
    
    if self.path.startswith(base_path) and base_path != "/":
      self.path = self.path[len(base_path):]
      
    try:
      self.clen = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
      self.clen = 0
    
    self.rfile = environ["wsgi.input"]
    self.wfile = StringIO()    
    
  def send_error(self, code, msg=None):
    self.wfile = StringIO()
    
    if msg == None:
      msg = "Error occurred"
    else:
      msg = "Error occurred: " + msg
    
    body = bstr("{error : %d, result : 0, message : \"%s\"}" % (code, msg))
    
    self.wfile.write(body)
    self.res_headers = {"Content-Length" : len(body), "Content-Type" : "application/x-javascript"}
    
    self.code = code
    self.codemsg = "ERR"
    
  def _finish(self):
    headers = []
    for k in self.res_headers:
      headers.append((k, bstr(self.res_headers[k])))
    
    self.wfile.seek(0)
    body = self.wfile.read() 
    
    return [bstr(str(self.code) + " " + self.codemsg), body, headers]
 
  def send_header(self, header, value):
    self.res_headers[header] = value
  
  def gen_headers(self, method, length, type, extra_headers={}):
    self.send_header("Content-Type", type)
    self.send_header("Content-Length", length)

    if "Via" in self.res_headers:
      uri = "http://"+serverhost+self.path
      print(uri)
      self.send_header("Content-Location", uri)
    
    for k in extra_headers:
      self.send_header(k, extra_headers[k])
    
    if "Via" in self.res_headers:
      pass
      #self.send_header("Via", self.res_headers["Via"])
    
    self.send_header("Server-Host", serverhost)
  
  def has_handler(self, path):
    for k in api_handlers:
      if path.startswith(k): return True
    return False
  
  def exec_handler(self, path, op):
    handler = None
    
    #find matching handler with largest prefix
    for k in api_handlers:
      if path.startswith(k):
        if handler == None or len(k) > len(handler):
          handler = k
        
    if handler != None:
      getattr(api_handlers[handler](), "do_"+op)(self)
      
  def do_request(self):
    if self.has_handler(self.path):
      self.exec_handler(self.path, self.method)
    elif self.path == "/3dsite": #in ["", "/"]:
      file = open((doc_root+"/src/html/main.html").replace("/", os.path.sep), "rb")
      
      body = file.read()
      file.close()
      
      self.wfile.write(body)
      self.gen_headers(self.method, len(body), "text/html")
    else:
      self.send_error(404, self.path)
    
def application(environ, start_response):
    bridge = WSGIServerBridge(environ)
    
    bridge.do_request()
    status, output, headers = bridge._finish()
    
    """
    output = ""
    for k in environ:
      output += "%s : \"%s\"\n" % (k, environ[k])
    
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(output)))]
    """
    
    start_response(status, headers)
    
    mysql_close_connections()
    
    return [output]
