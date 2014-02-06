import os, sys, os.path, math, random, time
import shelve, imp, struct, ply
import mimetypes

try:
	WITH_PY2 = True if sys.version_info.major <= 2 else False
except:
	WITH_PY2 = True

def bytes_py2(s, encoding):
  return str(s)

#example config_local.py file parameters
#serverhost = "127.0.0.1:8081"
#serverport = 8081
#base_path = "/"

#server_root = "/home/joeedh/dev/allshape/pyserver"
#doc_root = "/home/joeedh/dev/allshape"
#files_root = os.path.abspath(doc_root+".."+os.path.sep+"formacad_user_files"+os.path.sep)

#ipaddr = "127.0.0.1"

#db_host = "localhost"
#db_user = "root"
#db_passwd = ""
#db_db = "webglmodeller"

#json_mimetype = "application/x-javascript"

#import local config file

import config_local
mself = sys.modules["config"].__dict__
mlocal = sys.modules["config_local"].__dict__
 
for k in mlocal:
  mself[k] = mlocal[k]

#private globals
client_ip = ""

