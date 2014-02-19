#!/usr/bin/env python3
import sys, os.path, os, time, stat, struct, ctypes, io, subprocess, math, random, difflib
import ply, re, traceback
import argparse, base64

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
    print(len(sl), i)
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
  print(n.gen_js(0))
  raise "e"

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
 
b64tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
def b64chr(n):
  global b64tab
  
  if n < 0 or n > 63:
    raise RuntimeError("Base64 number must be between 0 and 63")
  
  return b64tab[n]
  
def vlq_encode(index):
  if index < 0:
    #raise Exception("don't use negative indices")
    index = -index;
    sign = 1
  else:
    sign = 0
  
  index = index << 1;
  index |= sign;
  
  a = index & 31
  b = (index>>5) & 31
  c = (index>>10) & 31
  d = (index>>15) & 31
  e = (index>>20) & 31
  f = (index>>25) & 31
  
  ar = [a, b, c, d, c, d, e, f]
  while (len(ar) > 1 and ar[-1] == 0):
    ar.pop(-1)
  
  ar = bytes(ar)
  
  out = ""
  for i, n in enumerate(ar):
    if (i != len(ar)-1):
      n |= 32
    
    c = b64chr(n)
    out += c
    
  return out

#print(vlq_encode(231234))  
#sys.exit()

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
      oline = seg[1].line - lastoline
      lastoline = seg[1].line
      
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
  
def process_generators(result, typespace):
  def visit_yields(node):
    p = node
    
    while not null_node(p) and type(p) != FunctionNode:
      p = p.parent
    
    if null_node(p):
      typespace.error("yield keyword only valid within functions")
    
    p.is_generator = True
    
  traverse(result, YieldNode, visit_yields)
  
  def node_has_yield(node):
    if type(node) == YieldNode:
      return True
      
    for c in node.children:
      if type(c) == FunctionNode:
        continue
       
      ret = node_has_yield(c)
      if ret: return True
      
    return False
  
  def visit_generators(node):
    def print_frames(frames, tlevel=0):
      tstr = tab(tlevel)
      tstr2 = tab(tlevel+1)
      
      s = ""
      for f in frames:
        if type(f) == Frame:
          if f.node != None:
            nstr = "%s %d " % (f.node.get_line_str(), f.label)
          else:
            nstr = str(f.label) + " "
            
          s += tstr + nstr + "{\n" + print_frames(f, tlevel+1)
          s += tstr + "}\n";
        else:
          s += tstr + f.get_line_str() + "\n"
      
      if tlevel == 0:
        print(s)
        
      return s
      
    if not node.is_generator: return
    
    def _remove_this(n):
      if n.val != "this": return
      if type(n.parent) != BinOpNode or n.parent.op != ".":
        #typespace.error("Can only reference members of 'this' in generators");
        n.val = "this2"
      else:
        n.parent.parent.replace(n.parent, n.parent[1])
      
    traverse(node, ForCNode, unpack_for_c_loops, exclude=[FunctionNode], copy_children=True);
    traverse(node, IdentNode, _remove_this)
    traverse(node, VarDeclNode, _remove_this)
    
    class Frame (list):
      def __init__(self, input=[], parent=None, node=None):
        super(Frame, self).__init__(input)
        self.parent = parent
        self.node = node
        self.locals = {}
        self.leaf = False
        self.pop_trystack = False
        
      def append(self, item):
        if type(item) == Frame:
          item.parent = self
        
        super(Frame, self).append(item)

      def prepend(self, item):
        if type(item) == Frame:
          item.parent = self
        
        super(Frame, self).insert(0, item)
        
    frames = frame = Frame(node=node)
    
    stack = [c for c in node.children[1:]]
    stack.reverse()
    
    stypes = set([ForLoopNode, WhileNode, DoWhileNode, IfNode,
                  ElseNode, StatementList, TryNode, CatchNode])
    
    def set_cur(n):
      if type(n) in [IfNode, WhileNode, 
                     DoWhileNode, ForLoopNode, CatchNode]:
        n._cur = 1;
        n._startcur = 1;
      else:
        n._cur = 0
        n._startcur = 0
      
      n._start = True
      n._has_yield = node_has_yield(n)
      
      for c in n:
        set_cur(c)
    
    for c in stack: 
      set_cur(c)
      
    def prior_if(n):
      if n.parent == None: return None
      
      sl = n.parent
      i = sl.children.index(n)-1
      while 1:
        while i >= 0:
          if type(sl[i]) == IfNode:
            break
          i -= 1
          
        if i >= 0 or null_node(n.parent): break
        
        i = sl.parent.children.index(sl);
        sl = sl.parent;
        
      if i < 0:
        typespace.error("Orphaned else node", n)
        sys.exit(-1)
      
      return sl[i]
      
    def prior_try(n):
      if n.parent == None: return None
      
      sl = n.parent
      i = sl.children.index(n)-1
      while 1:
        while i >= 0:
          if type(sl[i]) == TryNode:
            break
          i -= 1
          
        if i >= 0 or null_node(n.parent): break
        
        i = sl.parent.children.index(sl);
        sl = sl.parent;
        
      if i < 0:
        typespace.error("Orphaned catch node", n)
        sys.exit(-1)
      
      return sl[i]
      
    def is_stype(n):
      ret = type(n) in stypes # and (n._has_yield or n.parent._has_yield)
      
      if type(n) == CatchNode:
        ret |= prior_try(n)._has_yield
      if type(n) == ElseNode:
        ret |= prior_if(n)._has_yield
      
      if type(n) in [IfNode, ElseNode]:
        p5 = n.parent
        while not null_node(p5):
          if hasattr(p5, "_has_yield") and p5._has_yield:
            ret = True;
            break
          p5 = p5.parent
          
      return ret
    
    while len(stack) > 0:
      n = stack.pop(-1)
      
      if is_stype(n) and n._start:
        n._start = False
        if type(n) != StatementList or not is_stype(n.parent):
          frame2 = Frame(node=n)
          frame.append(frame2)
          frame = frame2
          n.frame = frame2
        
      if not is_stype(n):
        frame.append(n)
        
      if is_stype(n):
        if n._cur < len(n.children):
          stack.append(n)
          
          stack.append(n[n._cur])
          n._cur += 1
          
          #only do statement block on control nodes
          if type(n) != StatementList:
            n._cur = len(n.children)
        else:
          if type(n) != StatementList or not is_stype(n.parent):
            frame = frame.parent
            
    def handle_else(n):
      pif = prior_if(n)
      
      print("pif: ", type(pif))
      if pif == None: return None
      
      #print(pif)
      #print(pif.frame)
      #raise "sdf"
      expr = LogicalNotNode(ExprNode([pif[0].copy()]))
      expr[0].add_parens = True
      
      n2 = IfNode(expr)
      n.parent.replace(n, n2)
      n2.add(n[0])
      
      n2._has_yield = n._has_yield
      n2._startcur = 1
      n2._cur = 1
      n2._start = n._start
      
      n.parent = None
      
      return n2;
    
    def do_elses(f):
      if type(f) == Frame:
        if type(f.node) == ElseNode:
          n2 = handle_else(f.node)
          f.node = n2
          
        for c in f:
          if type(c) == Frame:
            do_elses(c)
          
    #do_elses(frames)
    
    def compact_frames(frames):
      i = 0
      frm = None
      while i < len(frames):
        f1 = frames[i]
        
        if type(f1) == YieldNode:
          frm = None
          
        if type(f1) != Frame:
          if frm == None:
            frm = Frame()
            frames.insert(i, frm)
            frm.parent = frames
            i += 1
            
          frames.remove(f1)
          i -= 1
          frm.append(f1)
        else:
          compact_frames(f1)
          frm = None
        
        if type(f1) == YieldNode:
          frm = None
          
        i += 1
        
    def label_frames(frames, cur=None):
      if cur == None: cur = [0]
      
      frames.label = cur[0]
      cur[0] += 1
      
      for f in frames:
        if type(f) == Frame:
          if f.node != None:
            f.node.frame = f
          label_frames(f, cur)
        else:
          f.frame = f
    
    def prop_frame_refs(node, f):
      if hasattr(node, "frame"): f = node.frame
      else: node.frame = f
      
      for c in node.children:
        prop_frame_refs(c, f)
        
    def apply_frame_scope(n, scope, frames):
      if type(n) == IdentNode:
        if n.val in scope:
          n.val = "scope.%s_%d" % (n.val, scope[n.val])
        else:
          p = n.parent
          n2 = n
          #check for implicit declarations within catch and loop nodes
          while not null_node(p):
            if type(p) in [CatchNode, WhileNode, ForLoopNode]: break
            n2 = p
            p = p.parent
            
          if not null_node(p) and n2 == p[0]:
            scope[n.val] = frames.label
            n.val = "scope.%s_%d" % (n.val, scope[n.val])
            
      elif type(n) == VarDeclNode:
        n.local = False;
        if "local" in n.modifiers: n.modifiers.remove("local")
        
        if hasattr(n.parent, "_c_loop_node"):
          frames = n.parent._c_loop_node.frame
          #print("yay", n.parent._c_loop_node.frame.label)
        
        if n.val not in scope:
          scope[n.val] = frames.label
        if n.val in scope:
          n.val = "scope.%s_%d" % (n.val, scope[n.val])
      for c in n.children:
        #ignore expr functions, but not nested functions?
        if type(c) == FunctionNode and type(c.parent) == AssignNode: continue
        if type(n) == BinOpNode and n.op == "." and c == n[1] and type(c) == IdentNode:
          continue
        if type(n) == FuncCallNode and type(c) == IdentNode and c == n[0]:
          continue
          
        apply_frame_scope(c, scope, frames)
          
    def frame_scope(frames, scope, depth=0):
      frames.scope = scope
      
      for f in frames:
        ss = "-"
        fstr = ""
        if type(f) == Frame:
          if f.node != None:
            fstr = f.node.get_line_str()
          else:
            if type(f[0]) == Frame: fstr = f[0].node.get_line_str()
            else: fstr = f[0].get_line_str()
          
          if f.node != None:
            ss = "+"
            scope2 = dict(scope)
            for i in range(f.node._startcur):
              apply_frame_scope(f.node[i], scope2, f)
            
            frame_scope(f, scope2, depth+1)
          else:
            frame_scope(f, scope, depth)
        else:
          fstr = f.get_line_str()
          apply_frame_scope(f, scope, frames)       
          
    scope = {}
    for a in node.children[0]:
      scope[a.val] = 0
    
    compact_frames(frames) 
    label_frames(frames)
    prop_frame_refs(node, frames)
    frame_scope(frames, scope)
    #print_frames(frames)
    
    def frames_validate(frames):
      def gen_frame_validate(frames, tlevel=0):
        s = ""
        tstr = tab(tlevel+1)
        tstr2 = tab(tlevel+2)
        
        for f in frames:
          if type(f) == Frame:
            if f.node != None:
              cs = f.node.children
              f.node.children = f.node.children[:node._startcur]
              f.node.add(ExprNode([]))
              
              c = f.node.gen_js(tlevel+1).split("\n")[0].replace("{", "").replace("\n", "").replace("}", "").strip()
              
              if c.endswith(";"): c = c[:-1]
              
              s += tstr + c + " {\n"
              f.node.children = cs
              
            s += gen_frame_validate(f, tlevel+1)
            if f.node != None:
              s += tstr + "}\n"
          else:
            c = tstr + f.gen_js(tlevel+2)
            s += c
            if c.strip().endswith("}") == 0 and c.strip().endswith(";") == 0:
              s += ";"
            s += "\n"
        
        if tlevel == 0:
          c = node.gen_js(0).split("\n")[0] + "\n"
          s = c + s + "}\n"
        return s
        
      #print(node.gen_js(0))
      #print(scope)
      print_frames(frames)
      s = gen_frame_validate(frames)
      
      s2 = js_parse(s).gen_js(0).strip()
      s = node.gen_js(0).strip()
      s = js_parse(s, print_stack=False).gen_js(0).strip()
      
      print(s==s2)
      if s != s2:
        import difflib
        print(dir(difflib))
        d = difflib.ndiff(s.split("\n"), s2.split("\n"))
        ds = ""
        for l in d:
          ds += l + "\n"

        #print(ds)
        line_print(s)
        line_print(s2)
    
    #frames_validate(frames)
    
    flatframes = []
    def flatten_frames(frames):
      flatframes.append(frames)
      
      for f in frames:
        if type(f) == Frame:
          flatten_frames(f)
    
    flatten_frames(frames)
    print([f.label for f in flatframes])
    
    def frames_transform(frames, node2):
      scope = frames.scope
    node2 = FunctionNode(node.name, node.lineno)
    node2.add(ExprListNode([]))
    
    for c in node.children[0]:
      node2[0].add(IdentNode(c.val))
    
    frames2 = frames
    
    for j, frames in enumerate(flatframes[1:]):
      p = frames.parent
      f = frames
      
      frames.return_frame = 0
      frames.return_frame_parent = 0
        
      i = p.index(f)      
      while i >= len(p)-1 and p.parent != None:
        f = p
        p = p.parent
        i = p.index(f)
      
      if p.parent == None:
        frames.return_frame = 0
        frames.return_frame_parent = p.label
      else:
        frames.return_frame = p[i+1].label      
        frames.return_frame_parent = p.label
    
    def f_name(f):
      return "frame_%d" % f.label
      
    def f_ref(f):
      return "this.frame_%d" % f.label
    
    for frames in flatframes:
      fname = f_name(frames)
      n = js_parse("""
             function $s1(scope) {
              if (_do_frame_debug) console.log("in $s1");

             }""", (fname), start_node=FunctionNode)
      
      if type(n[1]) != StatementList:
        n.replace(n[1], StatementList())
      n = n[1]
      
      func = n
      while type(func) != FunctionNode:
        func = func.parent
      
      excl = (type(frames.node) == StatementList and type(frames.parent.node) == FunctionNode) 
      if frames.node != None and not excl and type(frames.node) != FunctionNode:
        f = frames
        
        sl = StatementList()
        f.node[f.node._startcur] = sl
        
        #n.add(f.node)#XXX debug subnode
        #n = sl#XXX debug subnode
        
      def f_raw_next(f):
        if f.parent == None: 
           f = Frame()
           f.label = len(flatframes)
           return f
          
        while f.parent != None:
            i = f.parent.index(f)+1
            while i < len(f.parent):
              if type(f.parent[i]) == Frame:
                return f.parent[i]
              i += 1
              
            f = f.parent
            
        f = Frame()
        f.label = len(flatframes)
        return f
      
      def f_next(f, ignore_loops=False):
        if f.parent == None: 
          f = Frame()
          f.label = len(flatframes)
          return f
          
        while f.parent != None:
          i = f.parent.index(f)+1
          while i < len(f.parent):
            if type(f.parent[i]) == Frame:
              if type(f.parent[i].node) not in [CatchNode, ElseNode]:
                return f.parent[i]
            i += 1
            
          f = f.parent
          
          if not ignore_loops and f.parent != None and \
             type(f.parent.node) in \
             [WhileNode, DoWhileNode, ForLoopNode]:
            return f.parent
        
        f = Frame()
        f.label = len(flatframes)
        return f
        
      def f_first(f):
        for f2 in f:
          if type(f2) == Frame:
            return f2
          
      frames.funcnode = func
      #frames.subnode = n #XXX debug subnode
      frames.subnode = frames.funcnode
      
      local_frames = "["
      totframes = 0

      for i, f in enumerate(frames):
        if type(f) != Frame:
          frames.subnode.add(f)
          frames.leaf = True
          
        else:
          frames.leaf = False
          if len(local_frames) > 1: local_frames += ", "
          local_frames += f_ref(f) #.replace("this.", "")
          totframes += 1
          if f.node != None and type(f.node) != FunctionNode:
            if len(f.node.children) > f.node._startcur + 1:
              do_conv(f.node, f)
      
      if frames.leaf:
        f2 = f_next(frames)
        f2 = f2.label if f2 != -1 else -1
        frames.subnode.add(js_parse("return [$i, undefined];", [f2], start_node=ReturnNode));

      local_frames = "%s_frames = "%f_ref(frames) + local_frames + "];"
      #if frames.label == 0:
      #  local_frames = local_frames.replace("gen.", "this.")
        
      frames.frames = js_parse(local_frames)
      frames.totframes = totframes

    def build_next(f, parent=None):
      if type(f) != Frame: 
        return
      
      subnode = f.subnode
      if f.label >= 0: # and f.label < 3:
        n2 = js_parse("this.$s1 = 0;", [f_name(f)], start_node=AssignNode)
        n2.replace(n2[1], f.funcnode)
        f.funcnode.name = "(anonymous)"
        
        node2.add(n2) #f.funcnode)
          
      if f.totframes > 0:
        if f.node != None and type(f.node) == WhileNode:
          f2 = f_next(f)
          f2 = f2.label if f2 != -1 else -1
          n = js_parse("""
                       if (!"placeholder") {
                          return [$i1, undefined];
                       }
                       """, [f2])
          
          if n == None:
            typespace.error("internal error", subnode);
            
          n2 = find_node(n, StrLitNode);
          n2.parent.replace(n2, f.node[0])
          
          subnode.add(n)
          f2 = f_first(f);
          n.add(js_parse("return [$i, undefined];", [f2.label], start_node=ReturnNode))
        elif f.node != None and type(f.node) == TryNode:
          n = StatementList()
          
          if n == None:
            typespace.error("internal error", subnode);
          
          f3 = f_raw_next(f)
          while f3 != -1 and type(f3.node) != CatchNode:
            f3 = f_raw_next(f3);
          
          if f3 == -1:
            typespace.error("Orphaned try block", f.node)
          
          f3name = "_nfothing"
          if len(f3.node) > 0:
            f3name = f3.node[0].gen_js(0).replace("scope.", "")
            
          n.add(js_parse("""
             this.trystack.push([$i, "$s"]);
                          """, [f3.label, f3name]))
                          
          f2 = f_first(f);
          n.add(js_parse("return [$i, undefined];", [f2.label], start_node=ReturnNode))
          subnode.add(n)
          f2.pop_trystack = True
        elif f.node != None and type(f.node) == IfNode:
          f2 = f_first(f)
          f1 = f_raw_next(f)
          while type(f1.node) != ElseNode and f1.label != len(flatframes):
            f1 = f_raw_next(f1)
          
          if f1.label == len(flatframes):
            f1 = f_next(f)
          
          n = js_parse("""
            if (!("placeholder")) {
              return [$i1, undefined];
            } else {
              return [$i2, undefined];
            }
          """, [f1.label, f2.label]);
          
          n2 = find_node(n, StrLitNode)
          n2.parent.replace(n2, f.node[0].copy())
          
          if n == None:
            typespace.error("internal error", subnode);
          
          f2 = f_first(f);
          n.add(js_parse("return [$i, undefined];", [f2.label], start_node=ReturnNode))
          subnode.add(n)
          f2.pop_trystack = True
        elif f.node != None and type(f.node) == ElseNode:
          f2 = f_first(f)
          f1 = f_raw_next(f)
          while type(f1.node) != ElseNode and f1.label != len(flatframes):
            f1 = f_raw_next(f1)
          
          if f1.label == len(flatframes):
            f1 = f_next(f)
          
          n = js_parse("""
            return [$i1, undefined];
          """, [f2.label]);
          
          if n == None:
            typespace.error("internal error", subnode);
          
          f2 = f_first(f);
          subnode.add(n)
        elif f.node != None and type(f.node) == CatchNode:
          f2 = f_first(f)
          
          n = js_parse("""
            return [$i1, undefined];
          """, [f2.label]);
          
          if n == None:
            typespace.error("internal error", subnode);
          subnode.add(n)
        elif f.node != None and type(f.node) == ForLoopNode:
          f2 = f_first(f);
          f3 = f_next(f)
          
          f3 = f3.label if f2 != -1 else -1
          f2 = f2.label if f2 != -1 else -1
          
          n = js_parse("""
                       if ($n) {
                        return [$i, undefined];
                       } else {
                        return [$i, undefined];
                       }                       
                       """, [f.node[0][1], f2, f3])
          
          if n == None:
            typespace.error("internal error", subnode);
          
          subnode.add(n)
        
        
    node2.insert(1, js_parse("""
      this.__iterator__ = function() {
        return this;
      }
    """)[0])
    for f in flatframes:
      build_next(f, f.parent)
      #node2.insert(1, js_parse("this.frame_%d_frames = 0;" % f.label)[0])
    
    #process returns from within try nodes
    for f in flatframes:
      if f.parent != None and type(f.parent.node) == TryNode:
        def visit_rets1(n2):
          target = n2[0][0][0].val
          isyield = n2[0][0][1].val
          ni = n2.parent.index(n2)
          
          if target >= f_next(f.parent).label:
            n3 = js_parse("this.trystack.pop();")[0]
            n2.parent.insert(ni, n3)
          
        traverse(f.subnode, ReturnNode, visit_rets1, copy_children=True);
    
    #[what is this for?] process returns from within loop bodies
    """
    for f in flatframes:
      f2 = f.parent
      if f2 == None or f2.parent == None: continue
      
      while f2 != None:
        if type(f2.node) in [WhileNode, DoWhileNode, ForLoopNode]: break
        f2 = f2.parent
      
      if f2 == None: continue
      
      def visit_rets2(n2):
        target = n2[0][0][0].val
        isyield = n2[0][0][1].val
        
        if target >= f_next(f2, ignore_loops=True).label:
          n2[0][0][0].val = f2.label;
      traverse(f.subnode, ReturnNode, visit_rets2, copy_children=True);
    #"""
    
    #process yields
    for f in flatframes:
      f2 = f.parent
      set_yield = None
      
      def visit_rets2(n2):
        if set_yield != None:
          #print(n2)
          n2[0][0].replace(n2[0][0][1], set_yield);
          
      set_yield = find_node(f.subnode, YieldNode);
      if set_yield != None:
        set_yield.parent.remove(set_yield);
        set_yield = ArrayLitNode(ExprListNode([set_yield[0]]))
        
      traverse(f.subnode, ReturnNode, visit_rets2, copy_children=True);
    
    def find_parent_frame(f, ntypes, include_first=True):
      p = f
      if not include_first:
        p = p.parent
        
      while p != None:
        if type(p.node) in ntypes:
          return p
        p = p.parent
      return None
      
    #process breaks
    for f in flatframes:
      f2 = f.parent
      
      def visit_rets3(n2):
        p = n2.parent
        while not null_node(p) and p != f.subnode:
          if type(p) in [WhileNode, DoWhileNode, ForLoopNode]: break
          p = p.parent
          
        if p != f.subnode and not null_node(p): return #break corresponds to a loop internal to this frame
        
        p = find_parent_frame(f, [WhileNode, DoWhileNode, ForLoopNode], True)
          
        if p == None:
          typespace.error("Invalid break statement (switches within generators aren't supported yet)", n2)
        
        #XXX
        #what is this code for?
        #why seek out the loop's parent frame?
        #XXX
        
        #p2 = find_parent_frame(p, [WhileNode, DoWhileNode, ForLoopNode], False)
        #if 0: #p2 != None:
        #  f2 = f_next(p2)
        #else:
        
        f2 = f_next(p)
          
        n3 = js_parse("return [$i, undefined];", [f2.label], start_node=ReturnNode);
        n2.parent.replace(n2, n3)
        
      traverse(f.subnode, BreakNode, visit_rets3, copy_children=True);

    #process continues
    for f in flatframes:
      f2 = f.parent
      
      def visit_rets3(n2):
        p = n2.parent
        while not null_node(p) and p != f.subnode:
          p = p.parent
          
        if p != f.subnode and not null_node(p): return #continue corresponds to a loop internal to this frame
        p = f.parent
        while p != None:
          if type(p.node) in [WhileNode, DoWhileNode, ForLoopNode]:
            break;
          p = p.parent
          
        if p == None:
          typespace.error("Invalid continue statement")
        
        n3 = js_parse("return [$i, undefined];", [p.label], start_node=ReturnNode);
        n2.parent.replace(n2, n3)
        
      traverse(f.subnode, ContinueNode, visit_rets3, copy_children=True);

    firstnode = js_parse("if (this.first) {\n}", start_node=IfNode)
    firstnode2 = js_parse("if (this.first) {\n}", start_node=IfNode)
    firstnode.replace(firstnode[1], StatementList())
    firstnode2.replace(firstnode2[1], StatementList())
    flatframes[0].subnode.add(firstnode);
    node2.insert(1, firstnode2[1]);

    firstnode = firstnode[1]
    firstnode2 = firstnode2[1]
    
    args = list(node.children[0])
    for i3 in range(len(args)):
      argn = args[i3]
      while type(argn) not in [IdentNode, VarDeclNode]:
        argn = argn[0]
     
      args[i3] = argn.val
    
    scope = {}
    for f in flatframes:
      scope.update(f.scope)
    
      
    s = "{"
    j2 = 0
    for j, v in enumerate(scope.keys()):
      if j2 > 0: s += ", "
      j2 += 1
      
      if v in args:
        s += "%s:%s" % ("%s_%s"%(v, scope[v]), v)
      else:
        s += "%s:undefined" % ("%s_%s"%(v, scope[v]))
    s += "}"
      
    s = "this.scope = %s;\n" % s
    firstnode2.add(js_parse(s)[0])
    
    #ensure all frames have returns
    for f in flatframes:
      if not find_node(f.subnode, ReturnNode):
        f.subnode.add(js_parse("return [$i, undefined];", [f_next(f).label], start_node=ReturnNode));
      
    framelist = "["
    for i, f in enumerate(flatframes):
      if i > 0: framelist += ", "
      framelist += "this.frame_%i" % f.label
    framelist = "this.frames = %s];"%framelist
    node2.add(js_parse(framelist));
    
    node2.add(js_parse("""
      this.cur = 1;
      this.trystack = new Array();
      
      this.next = function() {
        var ret;
        while (this.cur < this.frames.length) {
          try {
            ret = this.frames[this.cur].call(this, this.scope);
          } catch (_generator_error) {
            if (this.trystack.length > 0) {
              var ts1 = this.trystack.pop();
              
              this.scope[ts1[1]] = _generator_error;
              
              ret = [ts1[0], undefined];
            } else {
              throw _generator_error;
            }
          }
          
          if (ret[0] == this.frames.length) {
            throw StopIteration;
            break;
          }
          
          if (ret[0] == this.cur) {
            console.trace();
            console.log("YEEK!")
            throw StopIteration;
          }
          
          this.cur = ret[0];
          
          if (ret[1] != undefined) {
            return ret[1][0];
          }
        }
      }
    """, []))
    
    node.parent.replace(node, node2)
    if 0:
      file = open("generator_test.html", "w")
      file.write("""
      <html><head><title>Generator Test</title></head>
      <script>
      FrameContinue = {1:1};
      FrameBreak = {2:2};
      """)
      file.write(node2.gen_js(3).replace("yield", "return"))
      file.write("""
  j = 0;
  for (var tst in new range(2, 8)) {
    console.log(tst);
    if (j > 10)
      break;
    j++;
  }
  </script>
  </html>
  """)
      file.close()
    
    #print(node2.gen_js(1))
    #print_frames(frames2)
    
  traverse(result, FunctionNode, visit_generators)
  
  del_attrs = ["_cur", "_startcur", "frame", "return_frame", "pop_trystack"]
  def cleanup_generator_garbage(n):
    for a in del_attrs:
      if hasattr(n, a):
        delattr(n, a)
    for c in n.children:
      cleanup_generator_garbage(c)
      
  cleanup_generator_garbage(result)
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
      
      print(node[0].val)
    
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
      buf += "\n//# sourceMappingURL=/content/%s\n"%(glob.g_outfile+".map")
    
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
      print(data[1017297])
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
  print(buf)
  buf = rparser.parse(buf, lexer=rlexer)
  print(buf)
 
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
    
    if glob.g_gen_log_code:
      buf, node = parse(data, expand_loops=not glob.g_emit_code, create_logger=True)
    else:
      buf, node = parse(data, expand_loops=not glob.g_emit_code)
    
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
