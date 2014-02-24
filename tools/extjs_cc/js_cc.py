#!/usr/bin/env python3
import sys, os.path, os, time, stat, struct, ctypes, io, subprocess, math, random, difflib
import ply, re, traceback
import argparse, base64, json

from js_lex import plexer
from js_global import glob, Glob

from js_ast import *
from js_parse import parser, print_err
from js_preprocessor import preprocess_text

plexer.lineno = 0

forloop_expansion_exclude = set(["__get_iter", "__get_iter2"])

class NoExtraArg:
  pass

def combine_try_nodes(node):
  def visit(n):
    if type(n.parent) == TryNode: return
    
    sl = n.parent

    i = sl.children.index(n)
    i -= 1
    
    #we remove n here, since we may have to ascend through
    #several layers of StatementList nodes
    sl.children.remove(n)
    while 1:
      while i >= 0:
        if type(sl[i]) == TryNode:
          break
        i -= 1
      
      if i >= 0 or null_node(sl.parent): break
      
      i = sl.parent.children.index(sl)
      sl = sl.parent
      
    if i < 0:
      sys.stderr.write("%s:(%d): error: orphaned catch block\n" % (n.file, n.line))
      sys.exit(-1)
    
    tn = sl[i]
    tn.add(n)
    
  traverse(node, CatchNode, visit, copy_children=True)

def combine_if_else_nodes(node):
  vset = set()
  found = [False];
  
  def visit(n):
    if type(n.parent) == IfNode: return
    
    if n in vset: return;
    vset.add(n);
    
    sl = n.parent

    i = sl.children.index(n)
    #i -= 1
    
    #we remove n here, since we may have to ascend through
    #several layers of StatementList nodes
    sl.children.remove(n)
    
    #clamp i
    i = max(min(i, len(sl)-1), 0);
    #print(len(sl), i)
    while 1:
      while i >= 0 and i < len(sl):
        if type(sl[i]) == IfNode:
          break

        i -= 1
      
      if i >= 0 or null_node(sl.parent): break
      
      i = sl.parent.children.index(sl)
      sl = sl.parent
      
    if i < 0:
      sys.stderr.write("%s:(%d): error: orphaned else block\n" % (n.file, n.line))
      sys.exit(-1)
    
    tn = sl[i]
    while len(tn) > 2:
      tn = tn[2][0];
    tn.add(n)
    found[0] = True
    
  traverse(node, ElseNode, visit, copy_children=True)
  while found[0]:
    found[0] = False
    traverse(node, ElseNode, visit, copy_children=True)

def unpack_for_c_loops(node):
  start = node.children[0]
  
  if node.parent.parent == None: return
  p = node.parent.parent
  
  i = node.parent.parent.children.index(node.parent)
  node.replace(start, ExprNode([]));
  node.parent.parent.insert(i, start)
  start._c_loop_node = node
  
  if type(node.parent[1]) != StatementList:
    sl = StatementList()
    sl.add(node.parent[1])
    node.parent.replace(node.parent[1], sl)
  
  sl = node.parent[1]
  inc = node[2]
  node.replace(inc, ExprNode([]))
  sl.add(inc);
  
  def handle_continues(n):
    if type(n.parent) != StatementList:
      sl = StatementList()
      n.parent.replace(n, sl)
      sl.add(n)
    
    n.parent.insert(n.parent.index(n), inc.copy())
  
  traverse(node.parent, ContinueNode, handle_continues, exclude=[FunctionNode], copy_children=True)
  
  node.parent[1]
    
def fetch_int(data, i1):
  ret = None
  i2 = i1+1
  
  while i2 < len(data):
    if data[i2-1] in [" ", "\t", "\n", "\r", ".", "x", "e"]:
      break
    
    try:
      ret = int(data[i1:i2])
    except:
      break
    i2 += 1
  
  return ret, i2-1

def caniter(obj):
  try:
    iter(obj)
  except:
    return False
  return True

def js_parse(data, args=None, file="", flatten=True, 
             print_stack=True, start_node=None,
             print_warnings=False, exit_on_err=True,
             log_productions=False, validate=False):
  back = glob.copy()
  def safe_get(data, i):
    if i < 0: return ""
    elif i >= len(data): return ""
    
    return data[i]
  
  if args != None:
    if not isinstance(args, tuple) and not isinstance(args, list):
      if caniter(args) and not isinstance(args, Node) \
           and type(args) not in [str, bytes]:
        args = list(args)
      else:
        args = (args,) #encapsulate single arguments in a tuple
    
    i = 0
    ai = 0
    while i < len(data)-2:
      if data[i] == "$" and safe_get(data, i-1) != "$":
        i1 = i
        t = data[i+1]
        i += 2
        
        arg, i = fetch_int(data, i)
        if arg == None:
          arg = ai
          ai += 1
        else:
          arg -= 1
          ai = max(arg, ai)
        
        if arg >= len(args):
          raise RuntimeError("Not enough args for format conversion in js_parse()")
       
        if t == "n":
          buf = args[arg].gen_js(0)
        elif t == "s":
          buf = str(args[arg])
        elif t in ["d", "i", "u"]:
          buf = str(int(args[arg]))
        elif t in ["f", "lf"]:
          buf = str(float(args[arg]))
        elif t == "x":
          buf = hex(int(args[arg]))
        else:
          buf = data[i1:i]
          
        data = data[:i1] + buf + data[i:]
        
        i = i1
      i += 1      
  
  glob.reset()
  glob.g_exit_on_err = exit_on_err
  glob.g_lexer = plexer
  glob.g_production_debug = False
  glob.g_file = file
  glob.g_print_stack = print_stack
  glob.g_print_warnings = print_warnings
  glob.g_log_productions = log_productions
  glob.g_validate_mode = validate
  
  plexer.lineno = plexer.lexer.lineno = 0
  plexer.input(data)

  ret = parser.parse(data, lexer=plexer)
  if glob.g_error:
    print("------------LLLLLLLLLLLLLLLLLLL yeek!!!")
    ret = None
  
  if glob.g_clear_slashr:
    print("\n")
    
  def fix_parents(node, lastnode = None):
    if node.parent in [0, None]:
      node.parent = lastnode
    
    for c in node.children:
      fix_parents(c, node)
    
  if ret != None:
    fix_parents(ret)
    if flatten:
      ret = flatten_statementlists(ret, None)
      if ret == None:
        traceback.print_stack()
        sys.stderr.write("error: internal parse error within js_parse\n")
        sys.exit(-1)
        
  if start_node != None and ret != None:
    def visit(n):
      if type(n) == start_node:
        return n
        
      for c in n.children:
        c2 = visit(c)
        if c2 != None:
          return c2
      
    ret = visit(ret)
  
  if ret != None:
    combine_try_nodes(ret)
  
  glob.load(back)
  
  return ret

from js_typespace import *
from js_generators import *
from js_process_ast import traverse, traverse_i, null_node, \
                           find_node, flatten_statementlists, \
                           kill_bad_globals

tst_js_arg_fmt = False

if tst_js_arg_fmt:
  n = js_parse("""
    for (var $n=0; $s<2; $n1++) {
      console.log("$x3 $i3 $f3");
    }
  """, args=(IdentNode("i"), "i", 1234), flatten=False, print_stack=False);
  #print(n.gen_js(0))
  raise "e"
 
b64tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def b64chr(n):
  global b64tab
  
  if n < 0 or n > 63:
    raise RuntimeError("Base64 number must be between 0 and 63")
  
  return b64tab[n]

b64tab2 = {}
for i, a in enumerate(b64tab):
  b64tab2[a] = i

def b64ord(c):
  global b64tab2
  
  if c not in b64tab2:
    raise RuntimeError("Base64 number must be between 0 and 63")
  
  return b64tab2[c]
  
_vlq_s = [0, 0, 0, 0, 0, 0, 0]
def vlq_encode(index):
  global _vlq_s
  
  index = int(index)
  
  sign = int(index < 0)
  index = abs(index)
  
  index = index << 1;
  index |= sign;
  
  a = index & 31
  b = (index>>5) & 31
  c = (index>>10) & 31
  d = (index>>15) & 31
  e = (index>>20) & 31
  f = (index>>25) & 31
  
  ar = _vlq_s
  ar[0] = a
  ar[1] = b
  ar[2] = c
  ar[3] = d
  ar[4] = e
  ar[5] = f

  i = 5
  while i > 0 and ar[i] == 0:
    i -= 1
  tot = i + 1
  
  out = ""
  i = 0
  while i < tot:
    n = ar[i]
    
    if i != tot-1:
      n |= 32
    
    c = b64chr(n)
    out += c
    i += 1
    
  return out

#returns new i
def vlq_decode(buf, i=0):
  val = 0
  n = 0
  while i < len(buf):
    c = b64ord(buf[i])
    val |= (c & 31)<<(n*5)
    
    n += 1
    i += 1

    if (c & 32) == 0: break
    
  if val & 1:
    val = -(val>>1)
  else:
    val = val>>1
    
  return i, val

#print(vlq_encode(231234))  
#sys.exit()

def parse_smap(smap):
  smap = json.loads(smap)
  
  map = smap["mappings"]
  i = 0
  
  lines = [[[]]]
  while i < len(map):
    c = map[i]
    if c == ",":
      lines[-1].append([])
    elif c == ";":
      lines.append([[]])
    else:
      i, val = vlq_decode(map, i)
      lines[-1][-1].append(val)
      i -= 1
      
    i += 1
  
  colsum = 0
  ocolsum = 0
  olinesum = 0
  sfile = 0
  
  #[col-lastcol, sourcefile, oline, ocol-lastocol]
  for l in lines:
    colsum = 0
    
    for seg in l:
      if len(seg) != 4:
        print("Unimplemented sourcemap type")
        raise RuntimeError("Unimplemented sourcemap type")
      
      colsum += seg[0]
      sfile += seg[1]
      olinesum += seg[2]
      ocolsum += seg[3]
      
      seg[0] = colsum;
      seg[1] = sfile
      seg[2] = olinesum
      seg[3] = ocolsum
  
  smap["mappings"] = lines
  return smap

def encode_smap(smap, lastocol=0, lastfile=0, lastoline=0):
  """
   encode raw smaps (not SourceMap objects,
   but objects generated by parsing json-encoded
   source maps
  """
  
  map = ""
  lines = smap["mappings"]
  
  lastcol = 0
  
  arr = [0, 0, 0, 0]
  i = 0
  itot = len(lines)
  while i < itot:
    l = lines[i]
    lastcol = 0
    
    if i > 0: map += ";"
    
    j = 0
    jtot = len(l)
    while j < jtot:
      seg = l[j]
      if j > 0: map += ","
      
      arr[0] = seg[0]-lastcol
      arr[1] = seg[1]-lastfile
      arr[2] = seg[2]-lastoline
      arr[3] = seg[3]-lastocol
      
      lastcol = seg[0]
      lastfile = seg[1]
      lastoline = seg[2]
      lastocol = seg[3]
      
      map += vlq_encode(arr[0]) + vlq_encode(arr[1]) + vlq_encode(arr[2]) + vlq_encode(arr[3])
      
      j += 1
    i += 1
    
  smap["mappings"] = map
  return smap

def concat_smaps(files):
  """
  concatenate non-index sourcemap files together
  """
  
  ret = {"file" : "app.js", "sources" : [], "sourceRoot" : "", "names" : []}
  giant_map = ""
  
  maxfile = 0
  maxoline = 0
  maxocol = 0
  maxcol = 0
  
  lastocol = 0
  lastoline = 0
  
  smaps = []
  start = True
  for fi, f in enumerate(files):
    file = open(f, "r")
    buf = file.read()
    file.close()
    smap = parse_smap(buf)
    
    print("Concatenating source map " + f + "...")
    lastocol2 = lastocol
    lastoline2 = lastoline
    
    for l in smap["mappings"]:
      for seg in l:
        seg[1] += maxfile
    
        lastoline2 = seg[2]
        lastocol2 = seg[3]
        
    ret["sources"] += smap["sources"]
    ret["names"] += smap["names"]
    
    lastfile = 0 if start else maxfile-1
    smap2 = encode_smap(smap, lastfile=lastfile, lastoline=lastoline, lastocol=lastocol)
    
    if not start: giant_map += ";"
    giant_map += smap2["mappings"]
    
    lastoline = lastoline2
    lastocol = lastocol2
    
    maxfile += len(smap["sources"])
    start = False
    
  ret["mappings"] = giant_map
  
  return ret
    
"""
f = open("out.js.map", "r")
smap = f.read()

f.close()

ret = json.loads(encode_smap(parse_smap(smap)))
smap = json.loads(smap)
print(type(smap), type(ret))
print(ret["mappings"] == smap["mappings"])

sys.exit(-1)
#"""

"""
buf = vlq_encode(234)
print(buf)
ret, i = vlq_decode(buf)
print(ret, i)

sys.exit(-1)
#"""

def gen_source_map(src, gensrc, map):
  #"""
  gensrc2 = ""
  for seg in map.segments:
    gensrc2 += seg[3]
  
  """
  print(gensrc2[0:175])
  
  raise JSError("bleh")
  return
  #"""
  
  #gensrc2 = gensrc
  
  basename = os.path.split(os.path.abspath(glob.g_file))[1]
  
  if glob.g_gen_smap_orig:
    orig = "/content/" + basename + ".origsrc"
  else:
    orig = ""
    
  js = """{
    "version": 3,
    "file" : "%s",
    "sourceRoot": "",
    "sources": ["%s"],
    "names": [],
    "mappings":
  """ % (basename, orig)
  
  segs2 = map.segments
    
  line_segs = [[]]
  for seg in segs2:
    text = seg[3]
    
    splits = []
    
    #"""
    while ("\n") in seg[3]:
      si = seg[3].rfind("\n")
      li = seg[0] + si
      
      if seg[si:] != "":
        splits.append([li, seg[1], len(seg[3])-si, seg[si:]])
      seg[3] = seg[3][:si]
    #"""
    
    splits.append(seg)
    splits.reverse()
    
    for i, s in enumerate(splits):
      if i == 0:
        line_segs[-1].append(s)
      else:
        line_segs.append([s])
  
  def get_col(lexpos, text):
    if len(line_segs) == 1:
      return lexpos
    
    i2 = 0
    while lexpos > 0 and text[lexpos] != "\n":
      i2 += 1
      lexpos -= 1
    return i2
  
  mapping = ""
  
  lastoline = 0
  lastocol = 0
  for i, line in enumerate(line_segs):
    if i != 0:
      mapping += ";"
      
    lastcol = 0
    for j, seg in enumerate(line):
      col = get_col(seg[0], gensrc)
      
      sourcefile = 0
      #filter out -1
      if seg[1].line == -1:
        seg[1].line = 0
        
      oline = seg[1].line - lastoline
      lastoline = seg[1].line
      
      if seg[1].line < 0:
        print(seg[1].line)
        print("YEEEK!!")
        
      ocol = get_col(seg[1].lexpos, src)
      
      vals = [col-lastcol, sourcefile, oline, ocol-lastocol]

      lastcol = col
      lastocol = ocol
      
      s = ""
      for v in vals:
        s += vlq_encode(v)
      
      if j != 0:
        mapping += ","
      mapping += s
  
  js += '"%s"\n}\n' % mapping
  
  if glob.g_outfile == "":
    print(js)
  else:
    file = open(glob.g_outfile + ".map", "w")
    file.write(js)
    file.close()
  return js
  
f_id = [0]
def parse_intern(data, create_logger=False, expand_loops=True, expand_generators=True):
  glob.g_lines = data.split("\n")
  
  if glob.g_preprocess_code:
    data = preprocess_text(data, glob.g_file)
    
  if glob.g_print_tokens:
    plexer.input(data)
    tok = plexer.token()
    while tok != None:
      print(tok)
      tok = plexer.token()
    plexer.input(data)
    
  glob.g_lexer = plexer
  result = parser.parse(data, lexer=plexer)
  
  if result == None:
    if glob.g_error_pre != None:
      glob.g_error = True
    
    result = StatementList()
    
  if glob.g_error:
    print_err(glob.g_error_pre)
    
  typespace = JSTypeSpace()
  
  if result != None:
    if len(result) > 0 and type(result[0]) == StrLitNode and result[0].val == '"use strict"':
      glob.g_force_global_strict = True
    
  if glob.g_force_global_strict:
    kill_bad_globals(result, typespace)
    
  if glob.g_clear_slashr:
    print("\n")
  
  if result != None and len(result) == 0:
    result = None
    return "", None
    #sys.stdout.write("Error: empty compilation\n");
    #raise JSError("Empty compilation");
  
  def expand_mozilla_forloops_new(node, scope):
    func = node.parent
    while not null_node(func) and type(func) != FunctionNode: 
      func = func.parent
      
    if not null_node(func):
      if func.name in forloop_expansion_exclude: return
    
    def prop_ident_change(node, oldid, newid):
      if type(node) in [IdentNode, VarDeclNode] and node.val == oldid:
        if type(node.parent) == BinOpNode and node.parent.op == ".":
          if node != node.parent[1]:
            node.val = newid
        else:
            node.val = newid
        
      for c in node.children:
        if type(c) == FunctionNode:
          continue
        prop_ident_change(c, oldid, newid)
    
    #for-in-loops don't seem to behave like for-C-loops,
    #the iteration variable is in it's own scope, and 
    #doesn't seem to affect the parent scope.
    val = node[0].val
    di = 0
    while node[0].val in scope:
      node[0].val = "%s_%d" % (val, di)
      di += 1
      
      #print(node[0].val)
    
    if node[0].val != val:
      scope[node[0].val] = node[0]
      prop_ident_change(node.parent, val, node[0].val)
    
    slist = node.parent.children[1]
    if type(slist) != StatementList:
      s = StatementList()
      s.add(slist)
      slist = s
    
    itername = node[0].val
    objname = node[1].gen_js(0)
    n2 = js_parse("""
      var __iter_$s1 = __get_iter($s2);
      var $s1;
      while (1) {
        var __ival_$s1 = __iter_$s1.next();
        if (__ival_$s1.done) {
          break;
        }
        
        $s1 = __ival_$s1.value;
      }
    """, (itername, objname));
    
    def set_line(n, slist, line, lexpos):
      n.line = line
      n.lexpos = lexpos
      
      for c in n.children:
          set_line(c, slist, line, lexpos)
    
    #preserving line info is a bit tricky.
    #slist goes through a js->gen_js->js cycle,
    #so make sure we still have it (and its
    #line/lexpos information).
    
    set_line(n2, slist, node.line, node.lexpos)
    for c in slist:
      n2[2][1].add(c)
    
    node.parent.parent.replace(node.parent, n2)
    
  def expand_mozilla_forloops(node, scope):
    func = node.parent
    while not null_node(func) and type(func) != FunctionNode: 
      func = func.parent
      
    if not null_node(func):
      if func.name in forloop_expansion_exclude: return
    
    def prop_ident_change(node, oldid, newid):
      if type(node) in [IdentNode, VarDeclNode] and node.val == oldid:
        if type(node.parent) == BinOpNode and node.parent.op == ".":
          if node != node.parent[1]:
            node.val = newid
        else:
            node.val = newid
        
      for c in node.children:
        if type(c) == FunctionNode:
          continue
        prop_ident_change(c, oldid, newid)
          
    whilenode = WhileNode(NumLitNode(1))
    slist = node.parent.children[1]
  
    #for-in-loops don't seem to behave like for-C-loops,
    #the iteration variable is in it's own scope, and 
    #doesn't seem to affect the parent scope.
    val = node[0].val
    di = 0
    while node[0].val in scope:
      node[0].val = "%s_%d" % (val, di)
      di += 1
      
      #print(node[0].val)
    
    if node[0].val != val:
      scope[node[0].val] = node[0]
      prop_ident_change(node.parent, val, node[0].val)
    
    itername = "__iter_%s"%(node.children[0].val);
    
    n = js_parse("var $s;", node.children[0].val, start_node=VarDeclNode)
    
    n2 = FuncCallNode(BinOpNode(IdentNode(itername), IdentNode("next"), "."))
    
    if type(slist) != StatementList:
      s = StatementList()
      s.add(slist)
      slist = s
    
    slist.prepend(AssignNode(n, n2))
    
    slist2 = StatementList()
    trynode = TryNode()
    trynode.add(slist)
    slist2.add(trynode)
    
    catch = CatchNode(IdentNode("_for_err"))
    slist3 = StatementList()
    slist3.add(js_parse("""
      if (_for_err !== StopIteration) {
        if (_do_iter_err_stacktrace) print_stack(_for_err);
        throw _for_err;
        break;
      }
      """)[0]);
    
    slist3.add(BreakNode());
    catch.add(slist3)
    
    slist2.add(catch)
    whilenode.add(slist2)
    
    slist4 = StatementList()
    n = js_parse("var $s;", itername, start_node=VarDeclNode)
    n2 = node.children[1]
    
    fn = FuncCallNode(IdentNode("__get_iter"))
    fn.add(ExprListNode([n2]))
    
    slist4.add(AssignNode(n, fn))
    slist4.add(whilenode)
    
    node.parent.parent.replace(node.parent, slist4)
  
  global f_id  

  f_id = [0]
  def create_type_logger(node):
    if node.name == "server_log": return
    line = node.line
    
    for c in node.children[0].children:
      file = c.file.replace("\\", "/")
      
      n1 = js_parse("""
      if (%s != undefined) {
        server_log(\"p|%s|%s:%s|%s:\" + get_type_name(%s));
      } else {
        server_log(\"p|%s|%s:%s|%s:undefined");
      }""" % (c.val, node.name, file, line, c.val, c.val, node.name, file, line, c.val),
      flatten=False)
      
      node.insert(1, n1)
    
    doneset = set()
    def set_return_code(n):
    
      if n in doneset: return
      doneset.add(n)
      
      global f_id
      
      i = f_id[0]
      f_id[0] += 1
      
      file = n.file.replace("\\", "/")
      ret = "__ret_%d" % i
      rstr = "r|%s|%s:%s|__ret:" % (node.name, file, n.line)
      
      n2 = js_parse("""
      var RET = undefined;
      server_log(\"RSTR\"+get_type_name(RET));
      return RET;
      """.replace("RET", ret).replace("RSTR", rstr),
      flatten=False)
      
      if n2 != None:
        if len(n) > 0:
          n3 = find_node(n2, VarDeclNode)
          doneset.add(n3)
          
          n3.replace(n3[0], n[0])
          
          n.parent.replace(n, n2)
      
    traverse(node, ReturnNode, set_return_code, exclude=[FunctionNode])
  
  
  flatten_statementlists(result, typespace)
  #combine_try_nodes(result);
  
  if expand_loops:
    if glob.g_harmony_iterators:
      traverse(result, ForInNode, expand_mozilla_forloops_new, use_scope=True)
    else:
      traverse(result, ForInNode, expand_mozilla_forloops, use_scope=True)
    #combine_try_nodes(result);
  
  #combine_try_nodes may have nested statementlists again, so better reflatten
  flatten_statementlists(result, typespace)
  
  if create_logger:
    traverse(result, FunctionNode, create_type_logger)
  
  #combine_if_else_nodes(result);
  if expand_generators:
    flatten_statementlists(result, typespace)
    process_generators(result, typespace);
    flatten_statementlists(result, typespace)
  
  debug_forloop_expansion = False
  if debug_forloop_expansion:
    reset = 0
    if reset or not os.path.exists("cur_d.txt"):
      f = open("cur_d.txt", "w")
      f.write("-1")
      f.close()
      
    f = open("cur_d.txt", "r")
    d = int(f.read())
    print("\n\nd: %d\n"%d)
    traverse_i(result, ForInNode, expand_mozilla_forloops, d, use_scope=True)
    f.close()
    
    f = open("cur_d.txt", "w")
    f.write(str(d+1))
    f.close()
  
  if glob.g_combine_ifelse_nodes:
    combine_if_else_nodes(result)
  
  if glob.g_print_nodes:
    print("nodes: ", result)
    pass
  
  if glob.g_gen_source_map:
    smap = SourceMap()
    def set_smap(node, smap):
      node.smap = smap
      for n in node:
        set_smap(n, smap)
    
    set_smap(result, smap)
    
    if not glob.g_minify:
      buf = result.gen_js(0)
      map = gen_source_map(data, buf, smap);
    else:
      buf, smap = js_minify(result)
      map = gen_source_map(data, buf, smap)
    
    if glob.g_add_srcmap_ref:
      spath = glob.g_outfile
      if os.path.sep in spath: spath = os.path.split(spath)[1]
      
      buf += "\n//# sourceMappingURL=/content/%s\n"%(spath+".map")
    
    if glob.g_gen_smap_orig:
      f = open(glob.g_outfile + ".origsrc", "w")
      f.write(data)
      f.close()
  else:
    if not glob.g_minify:
      buf = result.gen_js(0)
    else:
      buf, smap = js_minify(result)
  
  if glob.g_outfile == "":
    print(buf)
    if 0:
      file = open("generator_test.html", "w")
      file.write("""
      <html><head><title>Generator Test</title></head>
      <script>
      function arr_iter(keys)
      {
        this.keys = keys;
        this.cur = 0;
        
        this.next = function() {
          if (this.cur >= this.keys.length) {
            throw StopIteration;
          }
          
          return this.keys[this.cur++];
        }
      }

      __use_Iterator = true;

      function __get_iter(obj)
      {
        if (obj.__proto__.hasOwnProperty("__iterator__") || obj.hasOwnProperty("__iterator__")) {
          return obj.__iterator__();
        } else {
          if (__use_Iterator) {
            return Iterator(obj);
          } else {
            keys = []
            for (var k in obj) {
              keys.push(k)
            }
            return new arr_iter(keys);
          }
        }
      }

      function __get_iter2(obj)
      {
        if (obj.__proto__.hasOwnProperty("__iterator__") || obj.hasOwnProperty("__iterator__")) {
          return obj.__iterator__();
        } else {
          keys = []
          for (var k in obj) {
            keys.push([k, obj[k]])
          }
          return new arr_iter(keys);
        }
      }

      try {
        _tst = Iterator({});
      } catch (Error) {
        __use_Iterator = false;
        Iterator = __get_iter2;
      }
      FrameContinue = {1:1};
      FrameBreak = {2:2};
      """)
      file.write(buf.replace("yield", "return"))
      file.write("""
  j = 0;
  for (var tst in new range2(2, 8)) {
    if (_do_frame_debug) console.log(tst);
    if (j > 10)
      break;
    j++;
  }
  </script>
  </html>
  """)
      file.close()
    pass
    
  return buf, result
  
def add_newlines(data):
  data2 = ""
  
  tlvl = 0
  for c in data:
    data2 += c
    
    if c == "{": tlvl += 1
    if c == "}": tlvl -= 1
    
    if c == ";":
      data2 += "\n" + tab(tlvl)
    
  return data2
  
def parse(data, file=None, create_logger=False, expand_loops=True, expand_generators=True):
    if file != None: glob.g_file = file
    
    if glob.g_add_newlines:
      data = add_newlines(data)
      #print(data[1017297])
      data = data.replace("\\n", "\n")
      for l in data.split("\n"):
        try:
          print(l)
        except UnicodeEncodeError:
          pass
      return data, StatementList()
      
    try:
      return parse_intern(data, create_logger=create_logger, expand_loops=expand_loops, expand_generators=expand_generators)
    except JSError:
      if glob.g_print_stack:
        traceback.print_stack()
        traceback.print_exc()
      
      glob.g_error = True
      return "", None
        
def test_regexpr():
  from js_regexpr_parse import parser as rparser, rlexer
  data = r"/[ \t]+/g+"
  re_part = re.match(r"/.+/[a-zA-Z0-9_$]*", data)
  
  span = re_part.span()
  buf = data[span[0]:span[1]]
  #print(buf)
  buf = rparser.parse(buf, lexer=rlexer)
  #print(buf)
 
from js_minify import *
 
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
    
    f = open(args.infile, "r")
    data = f.read()
    f.close()
    
    doloops = not glob.g_emit_code and glob.g_expand_iterators
    
    if glob.g_gen_log_code:
      buf, node = parse(data, expand_loops=doloops, create_logger=True)
    else:
      buf, node = parse(data, expand_loops=doloops)
    
    if glob.g_emit_code:
      import js_type_emit
      js_type_emit.emit(node)
      
    if not glob.g_error:
      if args.outfile != "":
        f = open(args.outfile, "w")
        f.write(buf)
        f.close()
    else:
      return -1
    
    return 0

if __name__ == "__main__":
    import io, traceback
    
    try:
      ret = main()
    except SystemExit:
      ret = -1
    except:
      traceback.print_stack()
      traceback.print_exc()
      
      ret = -1
    sys.exit(ret)
