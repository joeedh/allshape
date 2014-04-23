import os, os.path, sys, subprocess, time, math, random

sep = os.path.sep

env = os.environ
if "INKSCAPE_PATH" in env:
  inkscape_path = env["INKSCAPE_PATH"]
else:
  inkscape_path = None
  
def np(path):
  return os.path.abspath(os.path.normpath(path))
  
def find(old, path):
  path = np(path)
  
  if old: 
    return old
    
  if os.path.exists(path):
    return path
  
  return None
  
def find_inkscape_win32():
  global inkscape_path
  
  paths = env["PATH"].split(";");
  for p in paths:
    p = p.strip()
    if not p.endswith("\\"): p += "\\"
    ret = find(inkscape_path, p + "inkscape.exe")
    if ret: return ret
    
  ret = find(inkscape_path, "c:\\Program Files\\Inkscape\\inkscape.exe")
  ret = find(ret, "c:\\Program Files (x86)\\Inkscape\\inkscape.exe")
  
  return ret
  
def find_inkscape_nix():
  global inkscape_path

  paths = env["PATH"].split(":");
  for p in paths:
    p = p.strip()
    if not p.endswith("/"): p += "/"
    ret = find(inkscape_path, p + "inkscape")
    if ret: return ret

  ret = find(inkscape_path, "/usr/local/bin/inkscape")
  ret = find(ret, "/usr/bin/inkscape")
  ret = find(ret, "/bin/inkscape");
  ret = find(ret, "~/inkscape/inkscape");

if "WIN" in sys.platform.upper():
  inkscape_path = find_inkscape_win32()
else:
  inkscape_path = find_inkscape_nix()

if inkscape_path == None:
  sys.stderr.write("Could not find inkscape binary");
  #this script is supposed to fail silently
  sys.exit();
  #sys.exit(-1)

files = ["iconsheet.svg"]

def gen_cmdstr(cmd):
  cmdstr = ""
  for c in cmd:
    cmdstr += c + " "
  return cmdstr

start_dir = os.getcwd()
for f in files:
  out = os.path.split(f)[1].replace(".svg", "")
  
  basepath = sep + "src" + sep + "datafiles" + sep
  dir = np(os.getcwd()) + basepath
  os.chdir(dir)
  
  cmd = [inkscape_path, "-C", "-e%s.png"%out, "-h 512", "-w 512", "-z", f]
  print("- " + gen_cmdstr(cmd))
  subprocess.call(cmd)
  
  cmd = [inkscape_path, "-C", "-e%s16.png"%out, "-h 256", "-w 256", "-z", f]
  print("- " + gen_cmdstr(cmd))
  subprocess.call(cmd)
  
  sub = ".."+sep
  if "WIN" in sys.platform.upper():
    cp = "copy"
  else:
    cp = "cp"
  
  """
  print("copying rendered icon sheet to build/")
  os.system("%s %s %s%sbuild%s%s" % (cp, "%s.png"%out, sub, sub, sep, "%s.png"%out))
  os.system("%s %s %s%sbuild%s%s" % (cp, "%s16.png"%out, sub, sub, sep, "%s16.png"%out))
  #"""
os.chdir(start_dir)