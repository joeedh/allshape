from log import elog, mlog, alog
from datetime import *
from time import time

_c = time()
def log(file, msg):
  global _c
  
  file.write("%s: %s\n" % (str(datetime.now()), str(msg)))
  if time() - _c > 0.3:
    file.flush()
    _c = time()
    
messages = open("messages.log", "a")
errors = open("errors.log", "a")
access = open("access.log", "a")

def mlog(msg):
  log(messages, msg)

def elog(msg):
  log(errors, msg)

def alog(msg):
  log(access, msg)

mlog("yay")