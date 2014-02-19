#!/usr/bin/env python3

import os, sys, os.path, time, random, math
import shelve, struct, io, imp, ctypes, re

try:
  import jsbuild_config_local
  do_smap_roots = jsbuild_config_local.do_smap_roots
except:
  do_smap_roots = False

from js_sources import js_sources
db = None
db_depend = None

filter = ""
if len(sys.argv) > 1:
  if len(sys.argv) == 3:
    build_cmd = sys.argv[1].lower()
    filter = sys.argv[2]
  else:
    build_cmd = sys.argv[1].lower()
    if build_cmd not in ["build", "cleanbuild", "clean", "loop"]:
      filter = build_cmd
      build_cmd = "single"
else:
  filter = ""
  build_cmd = "build"

if build_cmd == "clean": build_cmd = "cleanbuild"
if not os.path.exists("build"):
  os.mkdir("build")

#read sources
files = []
for f in js_sources: 
  if os.path.sep in f or "/" in f:
    f2 = os.path.split(f)[1]
  else:
    f2 = f
  files.append([f, "build/"+f2])

win32 = sys.platform == "win32"
PYBIN = sys.executable
if PYBIN == "":
  sys.stderr.write("Warning: could not find python binary, reverting to default\n")
  PYBIN = "python3.2"

PYBIN += " "

JCC = "tools/extjs_cc/js_cc.py".replace("/", os.path.sep)
TCC = "tools/tinygpu/tinygpu.py".replace("/", os.path.sep)

#minified, concatenated build
JFLAGS = "-gm -mn -nref"
if do_smap_roots:
  JFLAGS += " -gsr"
  
try:
  JFLAGS += " " + jsbuild_config_local.JFLAGS
except:
  pass
  
TFLAGS = ""

def cp_handler(file, target):
  if win32:
    return "copy %s %s" % (file, target)
  else:
    return "cp %s %s" % (file, target)

def jcc_handler(file, target):
  return PYBIN + "%s %s %s %s -np" % (JCC, file, target, JFLAGS)

def tcc_handler(file, target):
  return PYBIN + "%s %s" % (TCC, TFLAGS)

handlers = {
  r'.*\.js\b' : jcc_handler,
  r'.*\.html\.in\b' : tcc_handler,
  r'.*\.html\b' : cp_handler
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
  
  if build_cmd in ["filter", "single"] and fname.lower() not in filter \
                  and filter not in fname.lower():
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
  
  db = shelve.open("jbuild.db".replace("/", os.path.sep))
  db_depend = shelve.open("jbuild_dependencies.db".replace("/", os.path.sep))
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  built_files = []
  fi = 0
  for f, target, abspath in iter_files(files):
    fname = os.path.split(abspath)[1]
    fi += 1
    
    if not do_rebuild(abspath): continue
    
    build_depend(abspath);
    built_files.append([abspath, os.stat(abspath).st_mtime])
    
    re_size = 0
    for k in handlers:
      if re.match(k, f) and len(k) > re_size:
        cmd = handlers[k](f, target)
        re_size = len(k)
    
    perc = int((float(fi) / len(files))*100.0)
    print("[%i%%] " % perc, cmd)
    
    #execute build command
    ret = os.system(cmd)
    
    if ret in [-1, 65280]:
      print("build failure\n\n")
      built_files.pop(-1)

      for pathtime in built_files:
        db[pathtime[0]] = pathtime[1]
      
      db.close()
      db_depend.close()
      
      if build_cmd != "loop":
        sys.exit(-1)
      else:
        return
        
    print(ret)
  
  for pathtime in built_files:
    try:
      print("saving", db[pathtime[0]], pathtime[1])
    except KeyError:
      pass
    
    db[pathtime[0]] = pathtime[1]

  db.close()
  db_depend.close()
  
  #write aggregate, minified file
  if len(built_files) > 0:
    print("\n\nwriting app.js...")
    sys.stdout.flush()
    aggregate()
  
def aggregate(outpath="build/app.js"):
  outfile = open(outpath, "w")
  
  sbuf = """{"version" : 3,
  "file" : "app.js",
  "sections" : [
  """
  
  si = 0
  for f in files:
    if not f[0].endswith(".js"): continue
    
    f2 = open(f[1], "r")
    buf = f2.read()
    if "\n" in buf:
      print("EEK!!", f)

    outfile.write(buf)
    outfile.write("\n")
    f2.close()
    
    smap = f[1] + ".map"
    if 1: #os.path.exists(smap):
      if si > 0:
        sbuf += ",\n"
        
      line = si
      col = 0
      url = "/content/" + os.path.split(smap)[1]
      
      f2 = open(smap, "r")
      map = f2.read()
      f2.close()
      
      sbuf += "{\"offset\": {\"line\":%d, \"column\":%d}, \"url\": \"%s\"}" % \
              (line, col, url)
      si += 1

  sbuf += "]}\n"
  
  outfile.write("//# sourceMappingURL=/content/app.js.map\n")
  outfile.close()
  
  mapfile = open(outpath+".map", "w")
  mapfile.write(sbuf)
  mapfile.close()
  
  
if __name__ == "__main__":
  if build_cmd == "loop":
    while 1:
      main()
      time.sleep(0.75);
  else:
    main()
