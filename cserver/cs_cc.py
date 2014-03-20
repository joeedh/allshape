import sys, os.path, os, time, stat, struct, ctypes, io
import subprocess, math, random, difflib
import ply, re, traceback
import argparse, base64, json

from cs_parse import *
from cs_lex import *
from cs_ast import *
from cs_global import glob

from cs_process import compact_strnodes

def cs_parse(buf):
  if glob.g_printtokens:
    print("Printing tokens...")
    lexer.input(buf)
    tok = lexer.token()
    while tok != None:
      print("  ", tok)
      tok = lexer.token()
    print("\n")

  try:
    result = parser.parse(buf)
  except JSCCError:
    sys.exit(-1)
    
  compact_strnodes(result, StrNode)
  compact_strnodes(result, HtmlNode)
  
  return result

from cs_process import *
def parse_intern(buf):
  if glob.g_printtokens:
    print("Printing tokens...")
    lexer.input(buf)
    tok = lexer.token()
    while tok != None:
      print("  ", tok)
      tok = lexer.token()
    print("\n")

  try:
    result = parser.parse(buf)
  except JSCCError:
    sys.exit(-1)
    
  compact_strnodes(result, StrNode)
  compact_strnodes(result, HtmlNode)
  
  if glob.g_printnodes:
    print(result)
  
  buf2 = ""
  buf2 = gen_template(result)
  
  return buf2

def main():
  cparse = argparse.ArgumentParser(add_help=False)

  glob.add_args(cparse)
  cparse.add_argument("--help", action="help", help="Print this message")
    
  args = cparse.parse_args()
  glob.parse_args(cparse, args)
  
  glob.g_outfile = args.outfile
  
  #test_regexpr()
  #return 1
      
  glob.g_file = args.infile
  
  if args.infile == None:
      print("js_cc.py: no input files")
      return -1
  
  file = open(glob.g_file, "r")
  buf = file.read()
  file.close()
  
  buf2 = parse_intern(buf)
  if glob.g_outfile:
    file = open(glob.g_outfile, "w")
    file.write(buf2)
    file.close()
  else:
    print(buf2)
  
if __name__ == "__main__":
  try:
    main()
  except JSCCError:
    sys.exit(-1)