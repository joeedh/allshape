from datetime import *
from time import time
import config
import os.path

_c = time()
def log(file, msg):
  global _c
  
  file.write("%s: %s\n" % (str(datetime.now()), str(msg)))
  if 1: #time() - _c > 0.3:
    file.flush()
    _c = time()
    
prefix = config.doc_root+os.path.sep+"pyserver"+os.path.sep

def getfile(path):
  try:
    return open(path, "a")
  except:
    return open(path, "w")

messages = getfile(prefix+"messages.log")
errors = getfile(prefix+"errors.log")
access = getfile(prefix+"access.log")

def mlog(msg):
  print(msg)
  log(messages, msg)

def elog(msg):
  print(msg)
  log(errors, msg)

def alog(msg):
  print(msg)
  log(access, "%s: %s" % (config.client_ip, msg))
