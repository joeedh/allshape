from logger import elog, mlog, alog
from mysql_db import mysql_connect, get_qs, estr
import random, time, json, os, os.path, sys, math
from utils import *
from math import *
from auth import do_auth, gen_token, toktypes, rot_userid, unrot_userid
import datetime
from config import *

ROOT_PARENT_ID = 1
EMPTY_TAG = "__(empty)__"

#might as well use google's mime type for folders
FOLDER_MIME = "application/vnd.google-apps.folder"
file_restricted_fields = set(["diskpath", "cached_path", "flag"])

def is_folder(file):
  return file["mimeType"] == FOLDER_MIME or ("fileid" in file and file["fileid"] == ROOT_PARENT_ID)

def is_valid_file(file):
  return file["realpath"] != EMPTY_TAG
  
class File (dict):
  #metadata is added automatically from DB keys
  def __init__(self, meta={}):
    for k in meta:
      self[k] = meta[k]

class Folder (File):
  pass

def create_file(userid, filename, mimetype, parentid):
  #fileid "1" is root for active user
  cur, con = mysql_connect()
  
  cur.execute("INSERT INTO filedata (userid,parentid,mimeType,name) VALUES (%d,%d,\"%s\",\"%s\")"%(userid,parentid,mimetype,filename))
  con.commit()
  
  cur.execute("SELECT LAST_INSERT_ID()")
  ret = cur.fetchone()
  
  return ret["LAST_INSERT_ID()"]

def fetch_file(fileid):
  cur, con = mysql_connect()
  
  cur.execute("SELECT * FROM filedata WHERE fileid=%d"%fileid)
  ret = cur.fetchone()
  
  if ret == None:
    errlog("Warning: invalid fileid %s"%fileid)
    return None
  
  if ret["mimeType"] == FOLDER_MIME:
    f = Folder(ret)
  else:
    f = File(ret)
  
  return f

def update_file(fileid, meta):
  f = fetch_file(fileid)
  
  if f == None:
    errlog("Update for fileid %s failed; invalid id"%fileid)
    return
  
  cur, con = mysql_connect()
  for k in f:
    if k in meta and type(meta[k]) != type(f[k]):
      valid = False
      if type(f[k]) == int:
        try:
          meta[k] = int(meta[k])
          valid = True
        except:
         valid = False;
      if not valid:
        errlog("Invalid metadata")
        return
  
  extra_meta = {}
  for k in meta:
    if k not in f:
      extra_meta[k] = meta[k]
      continue
    elif k != "other_meta": f[k] = meta[k]
  
  if f["other_meta"] != "":
    other_meta = json.loads(f["other_meta"])
  else:
    other_meta = {}
  
  for k in extra_meta:
    other_meta[k] = extra_meta[k]
  
  f["other_meta"] = json.dumps(other_meta)
  print(f)
  qstr = "UPDATE filedata SET "
  for i,k in enumerate(f):
    val = estr(f[k])
    
    if i > 0: qstr += ","
    qstr += "%s=%s"%(k, val)
    
  qstr += " WHERE fileid=%d"%fileid
  
  cur.execute(qstr)
  con.commit()
  #print(qstr)
  
def fileid_to_publicid(fileid, userid):
  def gen_id(cols, id):
    h = hex(id).replace("0x", "")
    slen = cols-len(h)
    
    for i in range(slen):
      h = "0" + h
    
    return h
    
  return key_rot(gen_id(8, userid) + "." + gen_id(8, fileid));

def publicid_to_fileid(publicid):
  k = key_unrot(publicid)
  if k.count(".") != 1:
    return None
    
  userid, fileid = k.split(".")
  userid = int(userid, 16)
  fileid = int(fileid, 16)
  
  return userid, fileid

def resolve_path(path):
  print(path.split("/").remove(""))
  cs = path.split("/")
  while "" in cs:
    cs.remove("")
  
  if cs == None or len(cs) == 0:
    return ROOT_PARENT_ID
  
  parentid = ROOT_PARENT_ID
  cur, con = mysql_connect()
  
  print("\n\n", cs)
  for i, c in enumerate(cs):
    c = c.strip()
    print(c)
    qstr = "SELECT fileid FROM filedata WHERE"
    qstr += " parentid="+estr(parentid) + " AND"
    qstr += " name="+estr(c)
    
    cur.execute(qstr);
    ret = cur.fetchone()
    if ret == None:
      return None
    
    parentid = ret["fileid"];
    
  print("\n\n")
  return parentid
  
class FileAPI_DirList:
  basepath = "/api/files/dir/list"
  
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
    
    tok = qs["accessToken"][0]
    userid = do_auth(tok)
    
    if userid == None:
      serv.send_error(401)
      return
    
    if "id" in qs:
      folderid = qs["id"][0]
    else:
      folderid = resolve_path(qs["path"][0])
    
    if folderid == None:
      serv.send_error(400)
    
    qstr = "SELECT name,fileid,mimeType FROM filedata "
    qstr += "WHERE userid="+estr(userid) + " AND "
    qstr += "parentid="+estr(folderid)
    
    cur, con = mysql_connect()
    cur.execute(qstr)
    ret = cur.fetchall()
    
    files = []
    if ret != None:
      for row in ret:
        f = {}
        f["name"] = row["name"]
        f["id"] = fileid_to_publicid(row["fileid"], userid)
        f["mimeType"] = row["mimeType"]
        f["is_dir"] = row["mimeType"] == FOLDER_MIME
        
        files.append(f)
    
    body = json.dumps({"items": files})
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(bytes(body, "ascii"))

class FileAPI_GetMeta:
  basepath = "/api/files/get/meta"
  
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
    
    tok = qs["accessToken"][0]
    userid = do_auth(tok)
    
    if userid == None:
      serv.send_error(401)
      return
    
    if "path" in qs:
      fileid = resolve_path(qs["path"][0])
    else:
      fileid = publicid_to_fileid(qs["id"][0])[1]
    
    if fileid == None:
      serv.send_error(400)
    
    if fileid == None:
      serv.send_error(400)
    
    f = fetch_file(fileid)
    if f == None:
      serv.send_error(400)
      return
    
    if f["userid"] != userid:
      serv.send_error(401)
      return
    
    f2 = {}
    for k in f:
      if k in file_restricted_fields: continue
      
      if k == "fileid":
        f2["id"] = fileid_to_publicid(fileid, userid)
        continue
      if k == "other_meta" and f[k] != "" and f[k] != None:
        try:
          meta = json.loads(f[k])
        except ValueError:
          meta = {}
        
        for k2 in meta:
          f2[k2] = estr(meta[k2])
        continue
      
      f2[k] = estr(f[k])
        
    f2["is_dir"] = f2["mimeType"] == FOLDER_MIME
    
    body = json.dumps(f2)
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(bytes(body, "ascii"))

class UploadStatus:
  def __init__(self, token, path, userid, fileid):
    self.token = token
    self.path = path
    
    cs = os.path.split(path)
    self.dir = cs[0];
    self.time = time.time();
    
    self.size = -1
    self.cur = 0
    self.file = None
    self.file_init = False
    
    self.fileid = fileid
    self.userid = userid;
    
    if len(cs) == 1 or cs[1] == "" or cs[1] == None:
      self.name = cs[0]
    else:
      self.name = cs[1]
    
    self.gen_realpath()
    
  def gen_realpath(self):
    path = files_root + os.sep + rot_userid(self.userid)
    path += os.sep + self.dir.replace("/", os.sep)
    path = os.path.abspath(os.path.normpath(path))

    if not os.path.exists(path):
      os.makedirs(path)
    
    path = path + os.sep + key_rot(self.name)
    
    path = os.path.abspath(os.path.normpath(path))
    self.realpath = path;
  
cur_uploads = {}  
class FileAPI_UploadStart:
  basepath = "/api/files/upload/start"  
  
  def __init__(self):
    pass
  
  def do_GET(self, serv):
    print(get_qs(serv.path))
    print("fileapi access" + serv.path)
    
    qs = get_qs(serv.path)
    if "accessToken" not in qs or ("path" not in qs and "id" not in qs):
      serv.send_error(400)
      return
    
    tok = qs["accessToken"][0]
    userid = do_auth(tok)
    
    if userid == None:
      print("Need user id")
      serv.send_error(401)
      return
    
    path = qs["path"][0]
    if "id" in qs:
      fileid = qs["id"][0]
    else:
      fileid = resolve_path(path)
    
    if fileid == None:
      print("creating new file")
      cs = os.path.split(path)
      
      folderid = resolve_path(cs[0])
      if folderid == None:
        print("invalid folder " + cs[0])
        serv.send_error(401);
        return
      
      if len(cs) == 1 or cs[1] == "":
        fname = cs[0]
      else:
        fname = cs[1]
      
      mime = "application/octet-stream"
      fileid = create_file(userid, fname, mime, folderid)
      meta = fetch_file(fileid);
    else:
      meta = fetch_file(fileid);
    
    if meta == None:
      serv.send_error(400)
      return
      
    if is_folder(meta):
      print("target 'file' is a folder")
      serv.send_error(401)
      return
    
    utoken = gen_token("U", userid);
    
    global cur_uploads;
    cur_uploads[utoken] = UploadStatus(utoken, path, userid, fileid)
    
    realpath = cur_uploads[utoken].realpath
    cur, con = mysql_connect()
    
    qstr = "UPDATE filedata SET "
    qstr += "diskpath=%s"%estr(realpath)    
    qstr += " WHERE fileid=%d"%fileid
    cur.execute(qstr)
    con.commit()
    
    body = json.dumps({"uploadToken" : utoken});
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(bytes(body, "ascii"))

cur_uploads = {}  
class FileAPI_UploadChunk:
  basepath = "/api/files/upload"  
  
  def __init__(self):
    pass
  
  def do_PUT(self, serv):
    print(get_qs(serv.path))
    print("fileapi access" + serv.path)
    
    qs = get_qs(serv.path)
    if "accessToken" not in qs or "uploadToken" not in qs:
      serv.send_error(400)
      return
    
    tok = qs["accessToken"][0]
    utoken = qs["uploadToken"][0]
    
    userid = do_auth(tok)
    
    if userid == None:
      print("invalid authorization")
      serv.send_error(401)
      return
    
    if utoken not in cur_uploads:
      print("invalid upload token ", utoken)
      serv.send_error(401)
      return
      
    if "Content-Range" not in serv.headers:
      print("missing header")
      serv.send_error(400)
      return
      
    r = serv.headers["Content-Range"].strip()
    
    if not r.startswith("bytes"):
      print("malformed request 1")
      serv.send_error(400)
      return
    
    r = r[len("bytes"):].strip()
    r = r.split("/")
    print(r)
    
    if r == None or len(r) != 2:
      print("malformed request 2")
      serv.send_error(400)
      return
    
    try:
      max_size = int(r[1])
    except ValueError:
      print("malformed request 3")
      serv.send_error(400)
      return
    
    print("max_size", max_size)
    r = r[0].split("-")
    
    if r == None or len(r) != 2:
      print("malformed request 4")
      serv.send_error(400)
      return
    
    try:
      r = [int(r[0]), int(r[1])]
    except ValueError:
      print("malformed request 4")
      serv.send_error(400)
      return
    
    if r[0] < 0 or r[1] < 0 or r[0] >= max_size or r[1] >= max_size \
      or r[0] > r[1]:
      print("malformed request 5")
      serv.send_error(400)
      return
    
    print(r)
    status = cur_uploads[utoken]
    if status.size == -1:
      status.size = max_size
    
    print(status.realpath)
    print(r[1]-r[0]+1)
    
    buflen = r[1]-r[0]+1
    buf = serv.rfile.read(buflen)
    
    print("chunk len:", len(buf))
    
    if len(buf) != buflen:
      print("malformed request 6")
      serv.send_error(400)
      return
    
    if not status.file_init:
      status.file = open(status.realpath, "wb")
      csize = 1024*1024*1024
      ilen = math.ceil(max_size/csize);
      
      zerobuf = b""*csize;
     
      for i in range(ilen):
        if i == ilen-1:
          c = b""*(max_size%(csize+1))
        else:
          c = zerobuf;
        
        status.file.write(c)
      status.file.flush()
      status.file.close()
    
    status.file = open(status.realpath, "wb");
    status.file.seek(r[0]);
    status.file.write(buf);
    status.file.flush()
    status.file.close()
    
    print("chunk len:", len(buf))
    
    body = json.dumps({"success" : True});
    serv.gen_headers("PUT", len(body), json_mimetype)
    serv.wfile.write(bytes(body, "ascii"))


class FileAPI_GetFile:
  basepath = "/api/files/get"
  
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
    
    tok = qs["accessToken"][0]
    userid = do_auth(tok)
    
    if userid == None:
      serv.send_error(401)
      return
    
    if "path" in qs:
      fileid = resolve_path(qs["path"][0])
    else:
      fileid = publicid_to_fileid(qs["id"][0])[1]
    
    if fileid == None:
      serv.send_error(400)
    
    f = fetch_file(fileid)
    if f == None:
      serv.send_error(400)
      return
    
    if is_folder(f):
      serv.send_error(401)
      return
      
    if f["userid"] != userid:
      serv.send_error(401)
      return
    
    try:
      file = open(f["diskpath"], "rb")    
    except OSError:
      serv.send_error(404)
      return
    
    body = file.read()
    file.close()
    
    serv.gen_headers("GET", len(body), "application/octet-stream")
    serv.wfile.write(body)
