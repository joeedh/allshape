from datetime import *
from time import time
import config
import os.path

_c = time()
def log(file, msg):
  global _c
  
  file.write("%s: %s\n" % (str(datetime.now()), str(msg)))
  if time() - _c > 0.3:
    file.flush()
    _c = time()
    
prefix = config.doc_root+os.path.sep+"pyserver"+os.path.sep

messages = open(prefix+"messages.log", "a")
errors = open(prefix+"errors.log", "a")
access = open(prefix+"access.log", "a")

def mlog(msg):
  log(messages, msg)

def elog(msg):
  log(errors, msg)

def alog(msg):
  log(access, "%s: %s" % (config.client_ip, msg))
