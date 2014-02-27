#!/usr/bin/env python3

import os, sys, os.path, time, random, math
import shelve, struct, io, imp, ctypes, re
import subprocess, shlex

try:
  import jsbuild_config_local as config
  config_dict = config.__dict__
except IOError:
  config_dict = {}

def validate_cfg(val, vtype):
  if vtype == "bool":
    if type(val) == str:
      return val.lower() in ["0", "1", "true", "false", "yes", "no"]
    elif type(val) == int:
      return val in [0, 1]
    else: return val in [True, False]
  elif vtype == "int":
    return type(val) in [int, float] and floor(val) == val
  else: return True

localcfg = {}
def getcfg(key, default, type):
  if key in config_dict:
    val = config_dict[key]
    if not validate_cfg(val, type):
      raise RuntimeError("Invalid value for " + key + ": " + str(val))
    
    localcfg[key] = val
    
    return val
  return default

num_cores = getcfg("num_cores", 5, "int")
do_minify = getcfg("do_minify", True, "bool")
do_smaps = getcfg("do_smaps", True, "bool")
do_smap_roots = getcfg("do_smap_roots", False, "bool")
aggregate_smaps = getcfg("aggregate_smaps", True, "bool")
if len(localcfg) > 0:
  print("build config:")
  keys = list(localcfg.keys())
  keys.sort()
  for key in keys:
    val = localcfg[key]
    print("  " + key + ": " + str(val)) 
    
  print("\n")

#normpath helper func
def np(path):
  return os.path.abspath(os.path.normpath(path))

sp = os.path.sep

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
  if sp in f or "/" in f:
    f2 = os.path.split(f)[1]
  else:
    f2 = f
  files.append([f, "build/"+f2])

win32 = sys.platform == "win32"
PYBIN = sys.executable
print(PYBIN)
if PYBIN == "":
  sys.stderr.write("Warning: could not find python binary, reverting to default\n")
  PYBIN = "python3.2"

PYBIN += " "

JCC = np("tools/extjs_cc/js_cc.py")
TCC = np("tools/tinygpu/tinygpu.py")

#minified, concatenated build
JFLAGS = ""

if aggregate_smaps:
  JFLAGS += " -nref"

if do_minify:
  JFLAGS += " -mn"

if do_smaps:
  JFLAGS += " -gm"
  if do_smap_roots:
    JFLAGS += " -gsr"
  
try:
  JFLAGS += " " + jsbuild_config_local.JFLAGS
except:
  pass
  
TFLAGS = ""

def cp_handler(file, target):
  if win32:
    return "copy %s %s" % (np(file), np(target)) #file.replace("/", "\\"), target.replace("/", "\\"))
  else:
    return "cp %s %s" % (file, target)

def jcc_handler(file, target):
  return PYBIN + "%s %s %s %s -np" % (JCC, file, target, JFLAGS)

def tcc_handler(file, target):
  return PYBIN + "%s %s" % (TCC, TFLAGS)

class Handler (object):
  def __init__(self, func, can_popen=True):
    self.use_popen = can_popen
    self.func = func
    
handlers = {
  r'.*\.js\b' : Handler(jcc_handler),
  r'.*\.html\.in\b' : Handler(tcc_handler),
  r'.*\.html\b' : Handler(cp_handler, can_popen=False)
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
  
  if build_cmd in ["filter", "single"] and fname.lower() not in filter:
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
        print("bla3")
        return True
      elif path2 not in db:
        print("bla2", path2)
        return True
    
  return False

def failed_ret(ret):
  return ret != 0

def main():
  global db, db_depend
  
  procs = []
  
  db = shelve.open("jbuild.db".replace("/", sp))
  db_depend = shelve.open("jbuild_dependencies.db".replace("/", sp))
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  built_files = []
  failed_files = []
  fi = 0
  for f, target, abspath in iter_files(files):
    fname = os.path.split(abspath)[1]
    fi += 1
    
    if not do_rebuild(abspath): continue
    
    build_depend(abspath);
    built_files.append([abspath, os.stat(abspath).st_mtime, f])
    
    re_size = 0
    use_popen = None
    for k in handlers:
      if re.match(k, f) and len(k) > re_size:
        cmd = handlers[k].func(np(f), np(target))
        use_popen = handlers[k].use_popen
        re_size = len(k)
    
    perc = int((float(fi) / len(files))*100.0)
    print("[%i%%] " % perc, cmd)
    
    #execute build command
    while len(procs) >= num_cores:
      newprocs = []
      for p in procs:
        if p[0].poll() == None:
          newprocs.append(p)
        else:
          ret = p[0].returncode
          if failed_ret(ret):
            failed_files.append(p[1])
          
      procs = newprocs
      time.sleep(0.25)
    
    if len(failed_files) > 0: continue
    
    print(cmd)
    if use_popen:
      #shlex doesn't like backslashes
      if win32:
        cmd = cmd.replace("\\", "/")
      else:
        cmd = cmd.replace("\\", "\\\\")
      
      cmdlist = shlex.split(cmd)
      #cmdlist[0] = np(cmdlist[0])
      print(cmdlist)
      proc = subprocess.Popen(cmdlist)
      procs.append([proc, f])
    else:
      ret = os.system(cmd)
      if failed_ret(ret):
        failed_files.append(f)
  
  while len(procs) > 0:
    newprocs = []
    for p in procs:
      if p[0].poll() == None:
        newprocs.append(p)
      else:
        ret = p[0].returncode
        if failed_ret(ret): #ret in [-1, 65280]:
          failed_files.append(p[1])
    procs = newprocs
    time.sleep(0.25)
    
  if len(failed_files) > 0:
    print("build failure\n\n")
    for f in failed_files:
      for i, f2 in enumerate(built_files):
        if f2[2] == f: break
      
      built_files.pop(i)

    for pathtime in built_files:
      db[pathtime[0]] = pathtime[1]
    
    db.close()
    db_depend.close()
    
    if build_cmd != "loop":
      sys.exit(-1)
    else:
      return
        
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
    print("done.")
    
  if build_cmd != "loop":
    print("build finished")

def aggregate(outpath="build/app.js"):
  outfile = open(outpath, "w")
  
  if aggregate_smaps:
    f = open("build/srclist.txt", "w")
    for p in files:
      if not p[0].endswith(".js"): continue
      f.write(p[1]+".map"+"\n")
    f.close()
    
  sbuf = """{"version" : 3,
  "file" : "app.js",
  "sections" : [
  """

  for f in files:
    if not f[0].endswith(".js"): continue
    
    f2 = open(f[1], "r")
    buf = f2.read()
    if "-mn" in JFLAGS and "\n" in buf:
      print("EEK!!", f)

    outfile.write(buf)
    outfile.write("\n")
    f2.close()
  
  if do_smaps:
    si = 0
    for f in files:
      if not f[0].endswith(".js"): continue
      
      smap = f[1] + ".map"
      if si > 0:
        sbuf += ",\n"

      line = si
      col = 0
      url = "/content/" + os.path.split(smap)[1]

      f2 = open(smap, "r")
      map = f2.read()
      f2.close()

      sbuf += "{\"offset\": {\"line\":%d, \"column\":%d}, \"map\": %s}" % \
            (line, col, map)
      si += 1

    sbuf += "]}\n"
  
  if do_smaps:
    outfile.write("//# sourceMappingURL=/content/app.js.map\n")
  
  outfile.close()
  
  mapfile = open(outpath+".map", "w")
  mapfile.write(sbuf)
  mapfile.close()
  
  
if __name__ == "__main__":
  if build_cmd == "loop":
    while 1:
      main()
      time.sleep(0.15);
  else:
    main()
