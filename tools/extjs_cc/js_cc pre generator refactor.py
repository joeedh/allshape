#!/usr/bin/env python3.3
import sys, os.path, os, time, stat, struct, ctypes, io, subprocess, math, random, difflib
import ply, re, traceback
import argparse

from js_lex import plexer
from js_global import glob, Glob

from js_ast import *
from js_parse import parser, print_err
plexer.lineno = 0

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
    
  traverse(node, ElseNode, visit, copy_children=False)
  while found[0]:
    found[0] = False
    traverse(node, ElseNode, visit, copy_children=False)
    
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
        
  if start_node != None:
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
                           find_node, flatten_statementlists

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
    
    stypes = set([ForLoopNode, WhileNode, DoWhileNode,
                  IfNode, ElseNode, StatementList, TryNode, CatchNode])
    
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
    
    def is_stype(n):
      return type(n) in stypes and n._has_yield
      
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
          
    do_elses(frames)
    
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
      elif type(n) == VarDeclNode:
        n.local = False;
        if "local" in n.modifiers: n.modifiers.remove("local")
        
        if hasattr(n.parent, "_c_loop_node"):
          frames = n.parent._c_loop_node.frame
          #print("yay", n.parent._c_loop_node.frame.label)
          
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
    print_frames(frames)
    
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
      return "gen.frame_%d" % f.label
    
    for frames in flatframes:
      fname = f_name(frames)
      if frames.label == 0:
        n = js_parse("""
             this.next = function() {
              var this2 = this;
             };""", start_node=FunctionNode)
        
      else:
        n = js_parse("""
             function $s1(scope, gen) {
              if (_do_frame_debug) console.log("in $s1");

             }""", (fname), start_node=FunctionNode)
      
      if type(n[1]) != StatementList:
        n.replace(n[1], StatementList())
      n = n[1]
      
      func = n
      while type(func) != FunctionNode:
        func = func.parent
      
      if frames.label == 0:
        node2.add(func.parent)
      
      excl = (type(frames.node) == StatementList and type(frames.parent.node) == FunctionNode) 
      if frames.node != None and not excl and type(frames.node) != FunctionNode:
        f = frames
        
        if type(f.node) == StatementList:
          print(type(f.node.parent))
        
        sl = StatementList()
        f.node[f.node._startcur] = sl
        
        n.add(f.node)
        n = sl
        
      frames.funcnode = func
      frames.subnode = n
      
      def handle_yield(n, frame, in_for_c=None):
        if type(n) == YieldNode and not hasattr(n, "_y_h"):
          n._y_h = True
          if type(frame.parent.node) == ForLoopNode and type(frame.parent.node[0]) == ForCNode:
            c = n[0].gen_js(0)
            if len(c.replace(";", "").strip()) > 0:
              n2 = js_parse("var __yield_ret = %s;"%c)
              frame.subnode.add(n2)
              frame.subnode.add(js_parse(frame.parent.node[0][2].gen_js(0))[0]);
              n.replace(n[0], js_parse("[__yield_ret, 1]", start_node=ArrayLitNode)); 
          else:
            if len(n[0].gen_js(0).strip()) > 0:
              n.replace(n[0], js_parse("[$n, 1]", n[0], start_node=ArrayLitNode)); 
            else:
              n.replace(n[0], js_parse("[undefined, 1]", start_node=ArrayLitNode))
              
          n.print_return = True
            
        for c in n.children:
          handle_yield(c, frame)
      
      def handle_break(n, frame, add_to_subnode):
        if type(n) in [WhileNode, DoWhileNode, ForLoopNode] and not n._has_yield:
          return

        if add_to_subnode:
          n2 = js_parse("return [FrameBreak, 0];")[0]
          frame.subnode.add(n2)
          return
          
        if type(n) == BreakNode:
          n2 = js_parse("return [FrameBreak, 0];")[0]
          n.parent.replace(n, n2)
        
        for c in n.children:
          if type(c) not in [WhileNode, DoWhileNode, ForLoopNode]:
            handle_break(c, frame, False)
          
      def handle_continue(n, frame, add_to_subnode):
        if type(n) in [WhileNode, DoWhileNode, ForLoopNode] and not n._has_yield:
          return
          
        if add_to_subnode:
          n2 = js_parse("return [FrameContinue, 0];")[0]
          frame.subnode.add(n2)
          return
          
        if type(n) == ContinueNode:
          n2 = js_parse("return [FrameContinue, 0];")[0]
          n.parent.replace(n, n2)
        
        for c in n.children:
          handle_continue(c, frame, False)
                
      local_frames = "["
      totframes = 0
      def do_conv(f, frames):
        handle_yield(f, frames)
        
        if type(f) == BreakNode:
          handle_break(f, frames, True)
          return False
        else:
          handle_break(f, frames, False)
          
        if type(f) == ContinueNode:
          handle_continue(f, frames, True)
          return False
        else:
          handle_continue(f, frames, False)
        return True

      for i, f in enumerate(frames):
        if type(f) != Frame:
          if do_conv(f, frames):
            frames.subnode.add(f)
          frames.leaf = True
        else:
          frames.leaf = False
          if len(local_frames) > 1: local_frames += ", "
          local_frames += f_ref(f).replace("gen.", "")
          totframes += 1
          if f.node != None and type(f.node) != FunctionNode:
            if len(f.node.children) > f.node._startcur + 1:
              do_conv(f.node, f)
      
      local_frames = "%s_frames = "%f_ref(frames) + local_frames + "];"
      if frames.label == 0:
        local_frames = local_frames.replace("gen.", "this.")
        
      frames.frames = js_parse(local_frames)
      frames.totframes = totframes
    
    def build_next(f, parent=None):
      return
      if type(f) != Frame: 
        return
      
      for f2 in f:
        build_next(f2, f)
      
      subnode = f.subnode
      if (type(f.subnode) in [CatchNode, ElseNode]):
        raise "s"
      else:
        if f.label > 0: # and f.label < 3:
          f.parent.subnode.add(f.funcnode)
          pass
          
      if f.label != 0 and f.totframes > 0:
        subnode.add(js_parse("""
          if (gen.first) {
            $n1;
          }""", f.frames))
          
        if f.node != None and type(f.node) in [ForLoopNode, WhileNode, DoWhileNode]:
          n = js_parse("""
          var ret = undefined;
          
          if ($s1_cur >= $s1_frames.length)
            break;
          
          if (_do_frame_debug) console.log("$s1", $s1_cur, $s1_frames.length);
          while ($s1_cur < $s1_frames.length && (ret = $s1_frames[$s1_cur](scope, gen)) == undefined) {
            $s1_cur++;
            if ($s1_cur >= $s1_frames.length)
              break;
          }
          
          if (_do_frame_debug) console.log("  $s1 ret:", ret); 
          
          if (ret) {
            if (ret[0] == FrameBreak) {
              $s1_cur = $s1_frames.length;
              ret = undefined;
              if (_do_frame_debug) console.log("  $s1 breaking...");
              break;
            } else if (ret[0] == FrameContinue) {
              $s1_cur = 0;
              ret = undefined;
              if (_do_frame_debug) console.log("  $s1 continuing...");
              continue;
            } else {
              $s1_cur += ret[1];
              ret[1] = 0;
              
              if ($s1_cur >= $s1_frames.length) {
                $s1_cur = 0;
              }
              
              return ret;
            }
          } else {
            if ($s1_cur >= $s1_frames.length) {
              $s1_cur = 0;
            }
          }
          """, [f_ref(f)])
        elif not f.leaf:
          n = js_parse("""
          var ret = undefined;
          
          if (_do_frame_debug) console.log("$s1", $s1_cur, $s1_frames.length);
          while ($s1_cur < $s1_frames.length && (ret = $s1_frames[$s1_cur](scope, gen)) == undefined) {
            $s1_cur++;
            if ($s1_cur >= $s1_frames.length)
              break;
          }
          if (_do_frame_debug) console.log("  $s1 ret:", ret);          
        
          if ($s1_cur >= $s1_frames.length || ret == FrameContinue) {
            $s1_cur = 0;
          }
          
          if (ret != undefined) {
            $s1_cur += ret[1];
            ret[1] = 0;
                  
            return ret;
          }
          """, [f_ref(f)]);
        
        subnode.add(n)
        
    build_next(flatframes[0], flatframes[0])
    
    node2.insert(1, js_parse("this.first = true;")[0]);
    node2.insert(1, js_parse("""
      this.__iterator__ = function() {
        return this;
      }
    """)[0])
    for f in flatframes:
      node2.insert(1, js_parse("this.frame_%d_frames = 0;" % f.label)[0])
      
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
    
    for f in flatframes:
      firstnode2.add(js_parse("this.%s_cur = 0;" % f_name(f))[0])
      
    firstnode.add(flatframes[0].frames)
      
    flatframes[0].subnode.add(js_parse("""
        var ret;
        if (_do_frame_debug) console.log("$s1", $s1_cur, $s1_frames.length, $s1_scope);
        while ($s1_cur < $s1_frames.length && ((ret = $s1_frames[$s1_cur](this.scope, this)) == undefined)) {
          if (_do_frame_debug) console.log("$s1", $s1_cur);
          $s1_cur++;
        }
        if (_do_frame_debug) console.log("  $s1 ret:", $s1_cur, ret);
        
        this.first = false;
        if (ret != undefined && ret[0] != FrameBreak && ret[1] != FrameContinue) {
          $s1_cur += ret[1];
          
          return ret[0];
        }
        
        throw StopIteration;
    """, ["this." + f_name(flatframes[0])] ))
    
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
  
  del_attrs = ["_cur", "_startcur", "frame", "return_frame"]
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
  
  if glob.g_print_tokens:
    plexer.input(data)
    tok = plexer.token()
    while tok != None:
      print(tok)
      tok = plexer.token()
    plexer.input(data)
    
  glob.g_lexer = plexer
  
  result = parser.parse(data, lexer=plexer)
  
  typespace = JSTypeSpace()
  
  if glob.g_clear_slashr:
    print("\n")
  
  if result != None and len(result) == 0:
    result = None
  
  if result == None:
    if glob.g_error_pre != None:
      glob.g_error = True
    
    result = StatementList()
    
  if glob.g_error:
    print_err(glob.g_error_pre)
 
  def expand_mozilla_forloops(node, scope):
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
  combine_try_nodes(result);
  
  if expand_loops:
    traverse(result, ForInNode, expand_mozilla_forloops, use_scope=True)
    combine_try_nodes(result);
  
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
  
  if glob.g_print_nodes:
    print("nodes: ", result)
    pass
  
  buf = result.gen_js(0)
  
  if glob.g_outfile == "":
    print(buf)
    if 1:
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
  
def parse(data, file=None, create_logger=False, expand_loops=True, expand_generators=True):
    if file != None: glob.g_file = file
    
    return parse_intern(data, create_logger=create_logger, expand_loops=expand_loops, expand_generators=expand_generators)

def test_regexpr():
  from js_regexpr_parse import parser as rparser, rlexer
  data = r"/[ \t]+/g+"
  re_part = re.match(r"/.+/[a-zA-Z0-9_$]*", data)
  
  span = re_part.span()
  buf = data[span[0]:span[1]]
  print(buf)
  buf = rparser.parse(buf, lexer=rlexer)
  print(buf)
  
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
