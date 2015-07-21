import os, sys, os.path, math, random, time
import shelve, imp, struct
import mimetypes

#don't store file tree in database, serv file system directly
#serv_simple.py sets this to true
serv_local = False

#if serv_local is true, will allow access to full filesystem
#serv_simple also sets this to true
serv_all_local = False

#turn filenames into gibberish
mangle_file_paths = False 

#serv_simple.py sets this to true
use_sqlite = False

try:
	WITH_PY2 = True if sys.version_info.major <= 2 else False
except:
	WITH_PY2 = True

_orig_str = str

def bytes_py2(s, encoding=None):
  return _orig_str(s)
  
def safestr(s, encoding=None):
  return _orig_str(s)
  
if WITH_PY2:
  g = globals()
  g["bytes"] = bytes_py2
  g["str"] = safestr
  
unit_path = "/unit_test.html"
serv_unit_tests = False

content_path = "/content"
json_mimetype = "application/x-javascript"

#example config_local.py file parameters
#serverhost = "127.0.0.1:8081"
#serverport = 8081
#base_path = "/" #base URL path

#server_root = "/home/joeedh/dev/fairmotion/pyserver"
#doc_root = "/home/joeedh/dev/fairmotion"
#files_root = os.path.abspath(doc_root+".."+os.path.sep+"formacad_user_files"+os.path.sep)

#ipaddr = "127.0.0.1"

#db_host = "localhost"
#db_user = "root"
#db_passwd = ""
#db_db = "fairmotion"

#import local config file

import config_local

mself = sys.modules["config"].__dict__
mlocal = sys.modules["config_local"].__dict__
 
_is_set = set()
def is_set(k):
  global _is_set
  return k in _is_set

for k in mlocal:
  mself[k] = mlocal[k]
  _is_set.add(k)

#private globals
client_ip = ""

