from js_process_ast import traverse, traverse_i, null_node, \
                           find_node, flatten_statementlists, \
                           kill_bad_globals
from js_ast import *
from js_cc import js_parse, unpack_for_c_loops, combine_if_else_nodes

typespace = None

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

def visit_yields(node):
  p = node
  
  while not null_node(p) and type(p) != FunctionNode:
    p = p.parent
  
  if null_node(p):
    typespace.error("yield keyword only valid within functions")
  
  p.is_generator = True
  
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
  if not node.is_generator: return
  
  def _remove_this(n):
    if n.val != "this": return
    if type(n.parent) != BinOpNode or n.parent.op != ".":
      #typespace.error("Can only reference members of 'this' in generators");
      n.val = "this2"
    else:
      n.parent.parent.replace(n.parent, n.parent[1])
  
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

  traverse(node, ForCNode, unpack_for_c_loops, exclude=[FunctionNode], copy_children=True);
  traverse(node, IdentNode, _remove_this)
  traverse(node, VarDeclNode, _remove_this)
       
  frames = frame = Frame(node=node)
  
  stack = [c for c in node.children[1:]]
  stack.reverse()
  
  stypes = set([ForLoopNode, WhileNode, DoWhileNode, IfNode,
                ElseNode, StatementList, TryNode, CatchNode])
  
  for c in stack: 
    set_cur(c)
      
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
          return {done : true, value : undefined};
          break;
        }
        
        if (ret[0] == this.cur) {
          console.trace();
          console.log("YEEK!")
          return {done : true, value : undefined};
        }
        
        this.cur = ret[0];
        
        if (ret[1] != undefined) {
          return {value : ret[1][0], done : false};
        } else {
          return {value : undefined, done : false};
        }
      }
    }
  """, []))
  
  node.parent.replace(node, node2)

def process_generators(result, tspace):
  global typespace
  typespace = tspace
  
  traverse(result, YieldNode, visit_yields)
  traverse(result, FunctionNode, visit_generators)

  
  del_attrs = []
  def cleanup_generator_garbage(n):
    for a in del_attrs:
      if hasattr(n, a):
        delattr(n, a)
    for c in n.children:
      cleanup_generator_garbage(c)
      
  cleanup_generator_garbage(result)

  

def process_generators_old(result, typespace):
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
