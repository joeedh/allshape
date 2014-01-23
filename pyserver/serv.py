from logger import elog, mlog, alog
from http import *
from http.server import *
import os, sys, os.path, math, random, time, io, gc
import shelve, imp, struct, ctypes, ply
import mimetypes
from auth import AuthAPI_RefreshToken_WPHack, AuthAPI_OAuthStart, AuthAPI_GetUserInfo, AuthAPI_RefreshToken, AuthAPI_SessionToken
from fileapi import FileAPI_DirList, FileAPI_GetMeta, FileAPI_UploadStart, FileAPI_UploadChunk, FileAPI_GetFile
import config, json

import pymysql.err

debug_files = [] #"triangulate.js"]
api_handlers = {
  "/api/files/dir/list" : FileAPI_DirList,
  "/api/files/get/meta" : FileAPI_GetMeta,
  "/api/files/get" : FileAPI_GetFile,
  "/api/auth"  : AuthAPI_RefreshToken,
  "/api/auth/session" : AuthAPI_SessionToken,
  "/api/auth/userinfo" : AuthAPI_GetUserInfo,
  "/api/files/upload/start" : FileAPI_UploadStart,
  "/api/files/upload" : FileAPI_UploadChunk,
  "/api/auth/oauth" : AuthAPI_OAuthStart,
  "/api/auth/wpauthhack": AuthAPI_RefreshToken_WPHack
}

from config import doc_root, serverhost, ipaddr, serverport

def bstr(s):
  if type(s) == bytes: return s
  else: return bytes(str(s), "ascii")

def mime(path):
  return mimetypes.guess_type(path)

log_file = open("log.txt", "w")
py_bin = sys.executable
if py_bin == "":
  sys.stderr.write("Warning: could not find python binary, reverting to default\n")
  py_bin = "python3.2"

def debug_file(path):
  for d in debug_files:
    if d in path: return True
  return False
  
def run_build(path, do_all=False, always_build_file=False):
  import subprocess
  
  base = doc_root+os.path.sep+"js_build"+os.path.sep
  
  db = shelve.open(os.path.abspath(base+"../../../jbuild.db".replace("/", os.path.sep)))
  
  f = os.path.split(path)[1]
  realpath = f
  if not always_build_file and not do_all and f in db and os.path.exists(realpath):
    stat = os.stat(realpath).st_mtime
    if stat == db[f]:
      db.close()
      return
  
  db.close()
  
  cmd = [py_bin, base+"js_build.py"]
  if always_build_file and not do_all:
    cmd.append(os.path.split(path)[1])
  elif not do_all:
    cmd.append("filter")
    cmd.append(os.path.split(path)[1])
    
  cwd = doc_root+os.path.sep+"js_build"+os.path.sep
  
  ret = subprocess.Popen(cmd, cwd=cwd, stdout=sys.stdout, stderr=subprocess.PIPE)
  ret.wait()
  
  
  if ret.returncode != 0:
    errbuf = ""
    try:
      errbuf += str(ret.communicate(timeout = 0.1)[1], "latin-1");
    except subprocess.TimeoutExpired:
      pass
    
    return errbuf
  
class ReqHandler (BaseHTTPRequestHandler):
  def format_err(self, buf):
    if type(buf) == bytes: buf = str(buf, "latin-1")
    
    header = """
      <!DOCTYPE html><html><head><title>Build Error</title></head>
      <body><h1>Build Failure</h1><h3>
    """
    footer = """
      </h3>
      </body>
    """
    
    ret = ""
    for b in buf:
      if b == "\n": ret += "<br />"
      if b == " ": ret += "&nbsp"
      if b == "\t": ret += "&nbsp&nbsp"
      ret += b
    
    return (header + ret + footer).encode()
  
  def set_ipaddr(self):
    adr = self.client_address
    if type(adr) != str and len(adr) == 2:
      adr = str(adr[0]) + ":" + str(adr[1])
    else:
      adr = str(adr)
		
    config.client_ip = adr
      
  def do_GET(self):
    self.set_ipaddr()
    
    alog("GET " + self.path)
    
    if "Connection" in self.headers:
      keep_alive = self.headers["Connection"].strip().lower() == "keep-alive"
    else:
      keep_alive = False
    
    wf = self.wfile
    body = [b"yay, tst"]
    
    print(self.path)
    path = os.path.normpath(doc_root + self.path)
    
    if not os.path.exists(path):
      print("ble")
      if self.has_handler(self.path):
        self.exec_handler(self.path, "GET")
        return
      self.send_error(404)
      return
    
    if not self.path.startswith("/js_build/"):
      print(self.path)
      self.send_error(401)
      return

    if debug_file(path):
      always = True
      errbuf = run_build(path, always_build_file=always)
      
    if "js_build" in path and path.strip().endswith(".html"):
      errbuf = run_build(path, do_all=True)
    else:
      errbuf = None
    
    if errbuf != None:
      body = [self.format_err(errbuf)]
    else:
      f = open(path, "rb")
      
      csize = 1024*1024
      ret = f.read(csize)
      body = [ret];
      while ret not in ["", b'', None]:
        ret = f.read(csize);
        body.append(ret);
        
      f.close()
    
    if type(body) == str:
      body = [bytes.decode(body, "latin-1")]
    elif type(body) == bytes:
      body = [body]
    
    bodysize = 0
    for chunk in body:
      bodysize += len(chunk)
    
    if path.strip().endswith(".js"):
      mm = "application/javascript"
    else:
      mm = mime(path)[0]
    self.gen_headers("GET", bodysize, mm);
    
    b = b""
    for chunk in body:
      b += chunk
    
    wf.write(b);
    
    print(mm)
    
    #for chunk in body:
    #  wf.write(chunk);
  
  def _handle_mesh_post(self):
    buf = self.rfile.read()
    print(len(buf))
    
    body = "ok"
    self.gen_headers("POST", len(body), "text/text")
    self.wfile.write(body)
    
  def _handle_logger_post(self):
    body = b"ok"
    length = None
    for k in self.headers:
      if k.lower() == "content-length":
        length = int(self.headers[k])
        break
    
    if length == None:
      self.send_error(300)
      return
    
    buf = self.rfile.read(length)
    buf = str(buf, "ascii")
    
    log_file.write(buf + "\n")
    log_file.flush()
    
    #self.gen_headers("POST", len(body), "text/text")
    #self.wfile.write(body)
    #self.wfile.flush()
  
  def has_handler(self, path):
    print("bleh!!!")
    for k in api_handlers:
      print(k, path, "--")
      if path.startswith(k): return True
    return False
  
  def exec_handler(self, path, op):
    print(path, op)
    handler = None
    
    #find matching handler with largest prefix
    for k in api_handlers:
      if path.startswith(k):
        if handler == None or len(k) > len(handler):
          handler = k
        
    if handler != None:
      getattr(api_handlers[handler](), "do_"+op)(self)

  def restart(self):
    global restart_server
    #restart_server = True
    
    print("\nRestarting Server...\n")
    
    self.server.shutdown()
        
    
  def do_POST(self):
    self.set_ipaddr()
    path = self.path
    
    alog("POST " + self.path)
    
    if path == "/webgl_helper.webpy":
      self._handle_mesh_post()
    elif path == "/logger":
      self._handle_logger_post()
    elif self.has_handler(path):
      self.exec_handler(path, "POST")
    else:
      self.send_error(404)
  
  def do_PUT(self):
    alog("PUT " + self.path)
    self.set_ipaddr()
    path = self.path
    
    if self.has_handler(path):
      self.exec_handler(path, "PUT")
    else:
      self.send_error(404)
      
  def gen_headers(self, method, length, type, extra_headers={}):
    #if type == "text/html":
    #  type = "application/xhtml"
      
    self.wfile.write(bstr(method) + b" http/1.1\r\n")
    self.send_header("Content-Type", type)
    self.send_header("Content-Length", length)

    if "Via" in self.headers:
      uri = "http://"+serverhost+self.path
      print(uri)
      self.send_header("Content-Location", uri)
    
    for k in extra_headers:
      self.send_header(k, extra_headers[k])
    
    if "Via" in self.headers:
      pass
      #self.send_header("Via", self.headers["Via"])
    
    #self.send_header("Connection", "close")
    #self.send_header("Host", serverhost)
    self.send_header("Server-Host", serverhost)
    self.end_headers()
    
  def handle_mesh_post():
    body = "ok"
    
    def bstr(s):
      return bytes(str(s), "ascii")
    
    
    wf.write(body);
  
  def send_error(self, code, obj=None):
    if obj == None: obj = {}
    obj["result"] = 0
    obj["error"] = code
    
    body = json.dumps(obj)
    
    self.gen_headers("GET", len(body), "application/x-javascript")    
    self.wfile.write(bstr(body))
    
import ssl

certpath = "certificate.crt"

restart_server = True

while restart_server:
  restart_server = False
  
  server = HTTPServer((ipaddr, serverport), ReqHandler);
  #server.socket = ssl.wrap_socket(server.socket, certfile=certpath, keyfile="privateKey.key")

  server.serve_forever()

