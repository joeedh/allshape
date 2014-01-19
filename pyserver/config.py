from http import *
from http.server import *
import os, sys, os.path, math, random, time, io
import shelve, imp, struct, ctypes, ply
import mimetypes

serverhost = "joeedh.no-ip.info:8081"

win32 = sys.platform == "win32"
if win32:
  doc_root = "C:\\Users\\JoeEagar\\Google Drive\\WebGL\\"
else:
  doc_root = os.path.abspath(os.getcwd())
  doc_root = doc_root[:doc_root.find("WebGL")+5]
  if not doc_root.endswith(os.path.sep):
    doc_root += os.path.sep

files_root = os.path.abspath(doc_root+".."+os.path.sep+"formacad_user_files"+os.path.sep)

#"""
if win32:
  ipaddr = "192.168.0.43"
else:
  ipaddr = "127.0.0.1"
"""
ipaddr = "192.168.1.13"
#"""

db_host = "localhost"
db_user = "root"
db_passwd = ""
db_db = "webglmodeller"

json_mimetype = "application/x-javascript"

#private globals
client_ip = ""