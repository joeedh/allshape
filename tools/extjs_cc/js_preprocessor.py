import os, sys, traceback, struct, random, math, time, io, imp, os.path
import ply_preprocessor_parse as ppp

def preprocess_text_intern(data, filename, working_dir=None):
  lexer = ppp.lexer
  p = ppp.Preprocessor(lexer)
  p.parse(data, filename);
  s = ""
  while True:
    tok = p.token()
    if not tok: break
    s += tok.value
  
  #ensure trailing newline
  if not s.endswith("\n"):
    s += "\n"
  
  return s
  
def preprocess_text(data, filename, working_dir=None):
  oldcwd = None
  if working_dir != None:
    oldcwd = os.getcwd()
    try:
      os.chdir(oldcwd);
    except OSError:
      sys.stderr.write("Warning: could not change working directory")

  ret = preprocess_text_intern(data, filename, working_dir)

  if working_dir != None:
    try:
      os.chdir(oldcwd);
    except OSError:
      sys.stderr.write("Warning: could not restore working directory")

  return ret
