from http import *
from http.server import *
import os, sys, os.path, math, random, time, io
import shelve, imp, struct, ctypes, ply
import mimetypes

#example file parameters
#serverhost = "127.0.0.1:8081"

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

