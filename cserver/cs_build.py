#!/usr/bin/env python3

import os, sys, os.path, time, random, math
import shelve, struct, io, imp, ctypes, re
import subprocess, shlex
import imp, runpy
from math import floor

REBUILD = 1
WASBUILT = 2
msvc_mode = False

filter = ""
if len(sys.argv) > 1:
  if len(sys.argv) == 3:
    build_cmd = sys.argv[1].lower()
    filter = sys.argv[2]
  else:
    build_cmd = sys.argv[1].lower()
    if "msvc_mode" in build_cmd:
      print("msvc mode")
      msvc_mode = True
    elif build_cmd not in ["build", "cleanbuild", "clean", "loop"]:
      filter = build_cmd
      build_cmd = "single"
else:
  filter = ""
  build_cmd = "build"

sep = os.path.sep
def modimport(name):
  cwd = os.path.abspath(os.path.normpath(os.getcwd()))
  path = cwd + sep + name + ".py"
  
  mfile = open(path, "r")
  mod = imp.load_module(name, mfile, path, ('.py', 'r', imp.PY_SOURCE)) #runpy.run_path(cwd + sep + path + ".py")
  
  return mod

try:
  config = modimport("build_local")
  config_dict = config.__dict__
except (IOError, FileNotFoundError):
  config_dict = {}
  if not msvc_mode:
    print("warning, missing local_build.py")

def validate_cfg(val, vtype):
  if vtype == "bool":
    if type(val) == str:
      return val.lower() in ["0", "1", "true", "false", "yes", "no"]
    elif type(val) == int:
      return val in [0, 1]
    else: return val in [True, False]
  elif vtype == "int":
    return type(val) in [int, float] and floor(val) == val
  elif vtype == "string":
    return type(val) == str
  elif vtype == "path":
    return os.path.exists(val)
  
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
build_obj_code = getcfg("do_final_build", True, "bool")

if len(localcfg) > 0:
  if not msvc_mode:
    print("build config:")
  keys = list(localcfg.keys())
  keys.sort()
  for key in keys:
    val = localcfg[key]
    if not msvc_mode:
      print("  " + key + ": " + str(val)) 
    
  if not msvc_mode:
    print("\n")

#normpath helper func
def np(path):
  return os.path.abspath(os.path.normpath(path))

sp = os.path.sep

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
    
srcmod = modimport("cs_sources")
targets2 = srcmod.cs_targets
targets = []
for k in targets2:
  targets.append(Target(k))
  for s in targets2[k]:
    targets[-1].append(Source(s))
    
db = None
db_depend = None

if build_cmd == "clean": build_cmd = "cleanbuild"
if not os.path.exists("build"):
  os.mkdir("build")

for t1 in targets:
  for t2 in targets:
    if t1 == t2: continue
    
    for f1 in t1:
      for f2 in t2:
        if np(f1.source) == np(f2.source):
          t2.replace(f2, f1)

#read sources
for t in targets:
  for f in t:
    if sp in f.source or "/" in f.source:
      f2 = os.path.split(f.source)[1]
    else:
      f2 = f.source
    
    if f2.strip().endswith(".c"): 
      f2 = f2[:f2.rfind(".c")] + ".o"
    if f2.strip().endswith(".ccs"): 
      f2 = f2[:f2.rfind(".ccs")] + ".ccs.c"

    f.target = "build/" + f2;

win32 = sys.platform == "win32"
PYBIN = sys.executable
if PYBIN == "":
  sys.stderr.write("Warning: could not find python binary, reverting to default\n")
  PYBIN = "python3.2"

PYBIN += " "

PYBIN = getcfg("PYBIN", PYBIN, "path") + " "
CCS = getcfg("CCS", np("cs_cc.py"), "path")
CC = getcfg("CC", "gcc", "string")
do_debug = getcfg("debug", False, "bool")
do_profile = getcfg("profile", False, "bool")
docroot = getcfg("docroot", os.getcwd(), "path");

CFLAGS = getcfg("CFLAGS", "", "string")
if do_debug:
  CFLAGS += " -g"
if do_profile:
  CFLAGS += " -p"

if not msvc_mode:
  print("using python executable \"" + PYBIN.strip() + "\"")

#minified, concatenated build
CCSFLAGS = " -dr " + docroot + " "
if msvc_mode: CCSFLAGS += "-mv "

CCSFLAGS += getcfg("JFLAGS", "", "string")

def cp_handler(file, target):
  if win32:
    return "copy %s %s" % (np(file), np(target)) #file.replace("/", "\\"), target.replace("/", "\\"))
  else:
    return "cp %s %s" % (file, target)

def CCS_handler(file, target):
  ret = [PYBIN + "%s %s %s %s" % (CCS, file, target, CCSFLAGS)]
  if build_obj_code:
    ret += [CC_handler(target, target.replace(".c", ".o"))]
  
  return ret

def CC_handler(file, target):
  return CC + " %s -funsigned-char -c -w -o %s %s" % (file, target, CFLAGS)

def null_handler(file, target):
  return "nobuild"
  
class Handler (object):
  def __init__(self, func, can_popen=True):
    self.use_popen = can_popen
    self.func = func
    
handlers = {
  r'.*\.ccs\b' : Handler(CCS_handler, not build_obj_code),
  r'.*\.c\b' : Handler(CC_handler) if build_obj_code else Handler(null_handler),
  r'.*\.h\b' : Handler(cp_handler, False)
}

def iter_files(files):
  for f in files:
    abspath = os.path.abspath(os.path.normpath(f.source))
    yield [f.source, f.target, abspath, f.build]
    
#dest depends on src
def add_depend(dest, src):
  if not os.path.exists(src):
    #try to find next to dest
    src = os.path.split(dest)[0] + "/" + src
    if not os.path.exists(src):
      #sys.stderr.write("Could not find include file %s!"%src)
      #sys.exit(-1)
      pass
      return
      
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
    if "<#include" in line:
      line = line[line.find("<#include")+1:line.find("#>")].strip()
      
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
    #print(filename)
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
  
  abspath = os.path.abspath(os.path.normpath(abspath))
  if abspath in db_depend:
    del db_depend[abspath]

    build_depend(abspath)
    
    if abspath not in db_depend:
      return False
    
    for path2 in db_depend[abspath]:
      if path2 in db and safe_stat(path2) != db[path2]:
        if not msvc_mode:
          print("bla3")
        return True
      elif path2 not in db:
        if not msvc_mode:
          print("bla2", path2)
        return True
    
  return False

def failed_ret(ret):
  return ret != 0

def filter_srcs(files):
  global db, db_depend
  
  procs = []
  
  db = shelve.open("cbuild.db".replace("/", sp))
  db_depend = shelve.open("cbuild_dependencies.db".replace("/", sp))
  
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
  
  db.close()
  db_depend.close()
  
def build_target(files):
  global db, db_depend
  
  procs = []
  
  db = shelve.open("cbuild.db".replace("/", sp))
  db_depend = shelve.open("cbuild_dependencies.db".replace("/", sp))
  
  if build_cmd == "cleanbuild":  
    for k in db:
      db[k] = 0;
    db.sync();
  
  built_files = []
  failed_files = []
  fi = 0
  
  build_final = False
  for f, target, abspath, rebuild in iter_files(files):
    fname = os.path.split(abspath)[1]
    sf = files[fi]
    fi += 1
    
    build_final |= rebuild in [REBUILD, WASBUILT]
    if rebuild != REBUILD: continue
    
    build_depend(abspath)
    
    sf.build = WASBUILT
    
    built_files.append([abspath, os.stat(abspath).st_mtime, f])
    
    re_size = 0
    use_popen = None
    cmd = None
    for k in handlers:
      if re.match(k, f) and len(k) > re_size:
        cmd = handlers[k].func(np(f), np(target))
        use_popen = handlers[k].use_popen
        re_size = len(k)
    
    if cmd == None:
      sys.stderr.write("\nError: Could not find handler for " + f + "\n")
      sys.exit(-1)
    elif cmd == "nobuild":
      db[abspath] = os.stat(abspath).st_mtime
      db.sync()
      if not msvc_mode:
        print(abspath)
      continue
    
    perc = int((float(fi) / len(target))*100.0)
    #if not msvc_mode:
    print("[%i%%] " % perc, fname)
    
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
      if type(cmd) != list:
        cmd = [cmd]
      
      for c in cmd:
        if win32:
          c = c.replace("\\", "/")
        else:
          c = c.replace("\\", "\\\\")
        
        cmdlist = shlex.split(c)
        #cmdlist[0] = np(cmdlist[0])
        if not msvc_mode:
          print(cmdlist)
        proc = subprocess.Popen(cmdlist)
        procs.append([proc, f])
    else:
      if type(cmd) != list: cmd = [cmd]
      for c in cmd:
        ret = os.system(c)
        
        if failed_ret(ret):
          failed_files.append(f)
          break
          
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
    if not msvc_mode:
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
      if not msvc_mode:
        print("saving", db[pathtime[0]], pathtime[1])
    except KeyError:
      pass
    
    db[pathtime[0]] = pathtime[1]

  db.close()
  db_depend.close()
  
  if build_final:
    gen_final_target(files)
  
  if build_cmd != "loop":
    if not msvc_mode:
      print("build finished")

def gen_final_target(files):
  from cs_process import gen_page_uid
  
  target = "build/"+files.target
  if not msvc_mode:
    print("writing %s..."%target)
  
  target = os.path.abspath(os.path.normpath(target))
  file = open(target, "w")
  file.write("""#include "boilerplate.h"
#include "site_boilerplate.h"
""")

  for f in files:
    if not f.source.endswith(".ccs"):  continue
    f2 = open(f.target, "r")
    buf = f2.read()
    f2.close()
    
    file.write(buf+"\n")
  
  file.write("void *page_handlers[] = {");
  
  hnames = "char *page_handler_names[] = {";
  
  i = 0
  for f in files:
    if not f.source.endswith(".ccs"):  continue
    i += 1
    
    if i > 1: 
      file.write(",")
      hnames += ","
      
    file.write("\n")
    hnames += "\n"
    
    fn = f.source
    fn = os.path.abspath(fn)
    
    pre = os.path.commonprefix([os.path.abspath(docroot), fn])
    fn = fn[len(pre):].replace("\\", "/").strip().replace(".ccs", "")
    
    if not fn.startswith("/"):
      fn = "/" + fn
    if fn.endswith("/"):
      fn = fn[:-1]
    
    hnames += "\"" + fn + "\""
    uid = gen_page_uid(docroot, fn)
    fn = f.source
    if "/" in fn or "\\" in fn:
      fn = os.path.split(fn)[1].strip()
    
    file.write("  "+uid)
  
  file.write("\n};\n");
  hnames += "\n};\n";
  
  file.write(hnames);
  
  file.write("int page_handlers_len = sizeof(page_handlers) / sizeof(*page_handlers);\n");
  file.close()
  
def buildall():
  for t in targets:
    for s in t:
      s.build = False;
  
  for t in targets:
    filter_srcs(t)
    
  for t in targets:
    build_target(t)

def themain():  
  if build_cmd == "loop":
    while 1:
      buildall()
      time.sleep(0.75);
  else:
    buildall()

if __name__ == "__main__":
  themain()
