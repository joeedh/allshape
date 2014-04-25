#!/usr/bin/env python3

import os, sys, os.path, time, random, math
import shelve, struct, io, imp, ctypes, re
import subprocess, shlex, signal
import imp, runpy
from math import floor

#normpath helper func
def np(path):
  return os.path.abspath(os.path.normpath(path))

sp = os.path.sep

REBUILD = 1
WASBUILT = 2

sep = os.path.sep
def modimport(name):
  cwd = os.path.abspath(os.path.normpath(os.getcwd()))
  path = cwd + sep + name + ".py"
  
  mfile = open(path, "r")
  mod = imp.load_module(name, mfile, path, ('.py', 'r', imp.PY_SOURCE)) #runpy.run_path(cwd + sep + path + ".py")
  
  return mod

def config_tryimp(name):
  try:
    mod = modimport(name)
  except (IOError, FileNotFoundError):
    return {}
  return mod.__dict__

config_dict2 = config_tryimp("js_sources")
config_dict = config_tryimp("build_local")

def validate_cfg(val, vtype):
  if vtype == "bool":
    if type(val) == str:
      return val.lower() in ["0", "1", "true", "false", "yes", "no"]
    elif type(val) == int:
      return val in [0, 1]
    else: return val in [True, False]
  elif vtype == "int":
    return type(val) in [int, float] and floor(val) == val
  elif vtype == "path":
    return os.path.exists(val)
  
  else: return True

localcfg = {}
localcfg_core = {}
def getcfg_intern(key, default, type, env, localcfg):
  if key in env:
    val = env[key]
    if not validate_cfg(val, type):
      raise RuntimeError("Invalid value for " + key + ": " + str(val))
    
    localcfg[key] = val
    
    return val
  return default

def getcfg(key, default, type):
  return getcfg_intern(key, default, type, config_dict, localcfg)

def getcorecfg(key, default, type):
  return getcfg_intern(key, default, type, config_dict2, localcfg_core)

def addslash(path):
  while path.endswith("/"): path = path[:-2]
  while path.endswith("\\"): path = path[:-2]
  
  path += sep
  return path
  
num_cores = getcfg("num_cores", 5, "int")
do_minify = getcfg("do_minify", True, "bool")
do_smaps = getcfg("do_smaps", True, "bool")
do_smap_roots = getcfg("do_smap_roots", False, "bool")
aggregate_smaps = getcfg("aggregate_smaps", do_smaps, "bool")

build_path = getcorecfg("build_path", "build", "string")
target_path = getcorecfg("target_path", build_path, "string")
db_path = getcorecfg("db_path", ".build_db/", "string")

build_path = addslash(build_path)
target_path = addslash(target_path)
db_path = addslash(db_path)

if not os.path.exists(db_path):
  os.mkdir(db_path)

open_dbs = {}
def open_db(path):
  global open_dbs, db_path
  
  path = db_path + path
  db = shelve.open(path)
  open_dbs[id(db)] = db
  return db
  
def close_db(db):
  db.close()
  del open_dbs[id(db)]

procs = []
def signal_handler(signal, stack):
  print("====================================")
  sys.stderr.write("signal caught; closing databases. . .\n")
  
  for v in open_dbs.values():
    v.close()
  sys.stderr.write("done.\n")

#signal.signal(signal.SIGINT, signal_handler)

if len(localcfg) > 0:
  print("build config:")
  keys = list(localcfg.keys())
  keys.sort()
  for key in keys:
    val = localcfg[key]
    print("  " + key + ": " + str(val)) 
    
  print("\n")

class Source:
  def __init__(self, f):
    self.source = f
    self.target = ""
    self.build = False
    
  def __str__(self):
    return self.source + ":" + self.target
    
  def __repr__(self):
    return str(self)
  
class Target (list):
  def __init__(self, target):
    list.__init__(self)
    self.target = target
  
  def replace(self, a, b):
    self[self.index(a)] = b

srcmod = modimport("js_sources")

copy_targets = []
if hasattr(srcmod, "copy_targets"):
  for f1 in srcmod.copy_targets:
    tpath = "build"+sep+f1
    f2 = srcmod.copy_targets[f1]
    target = Target(tpath)
    
    s = Source(np(f2))
    s.target = tpath
    target.append(s)
    
    copy_targets.append(target)

targets2 = srcmod.js_targets
targets = []
for k in targets2:
  targets.append(Target(k))
  for s in targets2[k]:
    targets[-1].append(Source(s))
    

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

_fmap = {}
for t1 in targets:
  for f1 in t1:
    f1.source_abs = np(f1.source)
    _fmap[f1.source_abs] = f1
    
for t1 in targets:
  for i, f1 in enumerate(t1):
    if f1.source_abs in _fmap:
      t1[i] = _fmap[f1.source_abs]

#read sources
for t in targets:
  for f in t:
    if sp in f.source or "/" in f.source:
      f2 = os.path.split(f.source)[1]
    else:
      f2 = f.source
    f.target = build_path + f2;

win32 = sys.platform == "win32"
PYBIN = sys.executable
if PYBIN == "":
  sys.stderr.write("Warning: could not find python binary, reverting to default\n")
  PYBIN = "python3.2"

PYBIN += " "

PYBIN = getcfg("PYBIN", PYBIN, "path") + " "
JCC = getcfg("JCC", np("tools/extjs_cc/js_cc.py"), "path")
TCC = getcfg("TCC", np("tools/extjs_cc/js_cc.py"), "path")
print("using python executable \"" + PYBIN.strip() + "\"")

#minified, concatenated build
JFLAGS = "-dpr "

if aggregate_smaps:
  JFLAGS += " -nref"

if do_minify:
  JFLAGS += " -mn"

if do_smaps:
  JFLAGS += " -gm"
  if do_smap_roots:
    JFLAGS += " -gsr"

JFLAGS += getcfg("JFLAGS", "", "string")
TFLAGS = getcfg("TFLAGS", "", "string")

def cp_handler(file, target):
  if win32:
    return "copy %s %s" % (np(file), np(target)) #file.replace("/", "\\"), target.replace("/", "\\"))
  else:
    return "cp %s %s" % (file, target)

def svg_handler(file, target):
  return PYBIN + " tools/scripts/render_icons.py"
  
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
  r'.*\.html\b' : Handler(cp_handler, can_popen=False),
  r'.*\.png\b' : Handler(cp_handler, can_popen=False),
  r'.*\.js_' : Handler(cp_handler, can_popen=False),
  r".*\.svg\b" : Handler(svg_handler, can_popen=True)
}

def iter_files(files):
  for f in files:
    abspath = os.path.abspath(os.path.normpath(f.source))
    yield [f.source, f.target, abspath, f.build]
    
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
  if f.endswith(".png"): return
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

def filter_srcs(files):
  global db, db_depend
  
  procs = []
  
  db = open_db("jbuild.db")
  db_depend = open_db("jbuild_dependencies.db")
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  i = 0;
  for f, target, abspath, rebuild in iter_files(files):
    fname = os.path.split(abspath)[1]
    
    if not do_rebuild(abspath):
      i += 1
      continue
    
    files[i].build = REBUILD
    build_depend(abspath);
    i += 1
  
  close_db(db)
  close_db(db_depend)
  
def build_target(files):
  global db, db_depend, procs
  
  db = open_db("jbuild.db")
  db_depend = open_db("jbuild_dependencies.db")
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  built_files = []
  failed_files = []
  fi = 0
  
  filtered = list(iter_files(files))
  build_final = False
  for f, target, abspath, rebuild in filtered:
    fname = os.path.split(abspath)[1]
    sf = files[fi]
    fi += 1
    
    build_final |= rebuild in [REBUILD, WASBUILT]
    if rebuild != REBUILD: continue
    
    sf.build = WASBUILT
    
    built_files.append([abspath, os.stat(abspath).st_mtime, f])
    
    re_size = 0
    use_popen = None
    for k in handlers:
      if re.match(k, f) and len(k) > re_size:
        cmd = handlers[k].func(np(f), np(target))
        use_popen = handlers[k].use_popen
        re_size = len(k)
    
    perc = int((float(fi) / len(filtered))*100.0)
    
    """
    dcmd = cmd.replace(JCC, "js_cc").replace(PYBIN, "")
    dcmd = dcmd.split(" ")
    dcmd2 = ""
    for n in dcmd:
      if n.strip() == "": continue
      n = n.strip()
      if "/" in n or "\\" in n:
        n = os.path.split(n)[1]
      dcmd2 += n + " "
    dcmd = dcmd2  
    """
    
    dcmd = os.path.split(f)[1] if ("/" in f or "\\" in f) else f
    print("[%i%%] " % perc, dcmd)
    
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
      time.sleep(0.75)
    
    if len(failed_files) > 0: continue
   
    if use_popen:
      #shlex doesn't like backslashes
      if win32:
        cmd = cmd.replace("\\", "/")
      else:
        cmd = cmd.replace("\\", "\\\\")
      
      cmdlist = shlex.split(cmd)
      #cmdlist[0] = np(cmdlist[0])
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
    time.sleep(0.75)
    
  if len(failed_files) > 0:
    print("build failure\n\n")
    for f in failed_files:
      for i, f2 in enumerate(built_files):
        if f2[2] == f: break
      
      built_files.pop(i)

    for pathtime in built_files:
      db[pathtime[0]] = pathtime[1]
    
    close_db(db)
    close_db(db_depend)
    
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
  
  close_db(db)
  close_db(db_depend)
  
  #write aggregate, minified file
  if build_final:
    print("\n\nwriting %s..." % (target_path+files.target))
    sys.stdout.flush()
    aggregate(files, target_path+files.target)
    print("done.")
    
  if build_cmd != "loop":
    print("build finished")

def aggregate(files, outpath=target_path+"app.js"):
  outfile = open(outpath, "w")
  
  if aggregate_smaps:
    f = open(build_path+"srclist.txt", "w")
    for p in files:
      if not p.source.endswith(".js"): continue
      f.write(p.target+".map"+"\n")
    f.close()
    
  sbuf = """{"version" : 3,
  "file" : "app.js",
  "sections" : [
  """

  for f in files:
    if not f.source.endswith(".js") and not f.source.endswith(".js_"): continue
    
    f2 = open(f.target, "r")
    buf = f2.read()
    if "-mn" in JFLAGS and "\n" in buf:
      print("EEK!!", f)

    outfile.write(buf)
    outfile.write("\n")
    f2.close()
  
  if do_smaps:
    si = 0
    for f in files:
      if not f.source.endswith(".js"): continue
      
      smap = f.target + ".map"
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
    outfile.write("//# sourceMappingURL=/content/" + os.path.split(outpath)[1] + ".map\n")
  
  outfile.close()
  
  if aggregate_smaps:
    mapfile = open(outpath+".map", "w")
    mapfile.write(sbuf)
    mapfile.close()


def do_copy_targets():
  global copy_targets
  global db, db_depend
  
  db = open_db("jbuild.db")
  db_depend = open_db("jbuild_dependencies.db")
  
  try:
    for f in copy_targets:
      abspath = np(f.target)
      src = f[0].source
      
      stat = safe_stat(f[0].source)
      if not (abspath not in db or db[abspath] < stat): continue

      #db[abspath] = stat
      print(abspath, src)
      cmd = cp_handler(src, abspath)
      print(cmd)
      ret = os.system(cmd)
      
      if ret == 0:
        db[abspath] = stat
      else:
        print("build failure\n\n")

        sys.stderr.write("build failure\n");
        if build_cmd != "loop":
          sys.exit(-1)
        else:
          break
  except:
    import traceback
    
    db.close()
    db_depend.close()
    
    traceback.print_stack()
    traceback.print_last()
  
def buildall():
  for t in targets:
    for s in t:
      s.build = False;
  
  for t in targets:
    filter_srcs(t)
    
  for t in targets:
    build_target(t)
  
  do_copy_targets()
  
def themain():  
  if build_cmd == "loop":
    while 1:
      buildall()
      time.sleep(0.75);
  else:
    buildall()

if __name__ == "__main__":
  ret = 0
  try:
    themain()
  except KeyboardInterrupt:
    ret = -1

  sys.exit(ret)
