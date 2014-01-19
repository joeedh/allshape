#!/usr/bin/env python3.3

import os, sys, os.path, time, random, math
import shelve, struct, io, imp, ctypes, re

db = None
db_depend = None

filter = ""
if len(sys.argv) > 1:
  if len(sys.argv) == 3:
    build_cmd = sys.argv[1].lower()
    filter = sys.argv[2]
  else:
    build_cmd = sys.argv[1].lower()
    if build_cmd not in ["build", "cleanbuild", "clean"]:
      filter = build_cmd
      build_cmd = "single"
else:
  filter = ""
  build_cmd = "build"

if build_cmd == "clean": build_cmd = "cleanbuild"

files = []
for f in os.listdir("../"):
  if f.endswith(".js"):
    files.append([".."+os.path.sep+f, f])
    
for f in os.listdir("../server/"):
  if f.endswith(".js"):
    files.append(["../server/%s"%f, "../server/js_build/%s"%f])
    
files.append(["../tinygpu/tinygpu_test.html.in".replace("/", os.path.sep), ""])

win32 = sys.platform == "win32"
if win32:
  PYBIN = "python "
else:
  PYBIN = "python3.3 "

JCC = "../js_parser/js_cc.py".replace("/", os.path.sep)
TCC = "../tinygpu/tinygpu.py".replace("/", os.path.sep)

JFLAGS = ""
TFLAGS = ""

def jcc_handler(file, target):
  return PYBIN + "%s %s %s %s -np" % (JCC, file, target, JFLAGS)

def tcc_handler(file, target):
  return PYBIN + "%s %s" % (TCC, JFLAGS)

handlers = {
  r'.*\.js\b' : jcc_handler,
  r'.*\.html\.in\b' : tcc_handler
}

def iter_files(files):
  for f, target in files:
    if "[Conflict]" in f: continue
    
    abspath = os.path.abspath(os.path.normpath(f))
    yield [f, target, abspath]
    
#dest depends on src
def add_depend(dest, src):
  if not os.path.exists(src):
    sys.stderr.write("Could not find include file %s!"%src)
    sys.exit(-1)
    
  src = os.path.abspath(os.path.normpath(src))
  dest = os.path.abspath(os.path.normpath(dest))
  
  if dest not in db_depend:
    db_depend[dest] = set()
  
  fset = db_depend[dest]
  fset.add(src)
  
  db_depend[dest] = fset
  
def build_depend(f):
  file = open(f, "r")
  for line in file.readlines():
    if not (line.strip().startswith("#") and "include" in line and '"' in line):
      continue
    
    line = line.strip().replace("\n", "").replace("\r", "")
    
    i = 0
    in_str = 0
    filename = ""
    word = ""
    while i < len(line):
      c = line[i]
      if c in [" ", "\t", "#"]:
        i += 1
        continue
      elif c == '"':
        if in_str:
          break
        else:
          in_str = True
      elif c == "<" and not in_str:
        in_str = True
      elif c == ">" and in_str:
        in_str = False
        break
      else:
        if in_str:
          filename += c
        else:
          word += c
      i += 1
    add_depend(f, filename)

def safe_stat(path):
  #try:
  return os.stat(path).st_mtime
  #except OSError:
  #  return random()*(1<<22)
  #except IOError:
  #  return random()*(1<<22)
    
def do_rebuild(abspath):
  global db, db_depend
  
  fname = os.path.split(abspath)[1]
  
  if "[Conflict]" in abspath: return False
  
  if build_cmd in ["filter", "single"] and fname not in filter:
    return False
  
  if abspath not in db or build_cmd in ["cleanbuild", "single"]:
    return True
  
  if safe_stat(abspath) != db[abspath]:
    return True
  
  if abspath in db_depend:
    del db_depend[abspath]
    build_depend(abspath)
    
    if abspath not in db_depend:
      return False
    
    for path2 in db_depend[abspath]:
      if path2 in db and safe_stat(path2) != db[path2]:
        return True
      elif path2 not in db:
        return True
    
  return False

def main():
  global db, db_depend
  
  db = shelve.open("../../../jbuild.db".replace("/", os.path.sep))
  db_depend = shelve.open("../../../jbuild_dependencies.db".replace("/", os.path.sep))
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  built_files = []
  for f, target, abspath in iter_files(files):
    fname = os.path.split(abspath)[1]
      
    if not do_rebuild(abspath): continue
    
    build_depend(abspath);
    built_files.append(abspath)
    
    for k in handlers:
      if re.match(k, f):
        cmd = handlers[k](f, target)
        break
    
    print(cmd)
    ret = os.system(cmd)
    
    if ret in [-1, 65280]:
      print("build failure\n\n")
      built_files.remove(abspath)
      for abspath in built_files:
        db[abspath] = os.stat(abspath).st_mtime
      
      db.close()
      db_depend.close()
      
      sys.exit(-1)
    print(ret)
  
  for abspath in built_files:
    try:
      print("saving", db[abspath], os.stat(abspath).st_mtime)
    except KeyError:
      pass
    
    db[abspath] = os.stat(abspath).st_mtime

  db.close()
  db_depend.close()

if __name__ == "__main__":  
  main()