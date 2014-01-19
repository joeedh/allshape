import sys, os.path, os, time, stat, struct, ctypes, io, subprocess, math, random, difflib
import ply, re

def sys_exit(ret_val):
  #exits with status ret_val, and
  #suppresses the stupid stacktrace
  #caused by the fact that sys.exit()
  #works by raising an exception.
  sys.stderr = io.StringIO()
  sys.exit(ret_val)
  
"""
tinygpu processing language.

compiles to WebGL-compliant GLSL.

programs are kernels, that operate on
a stream of data.

==Inputs==
inputs are declared with uniform (for constant values) and input

for input streams of the same size as the output stream, just declare the basic type
and the indexing will be done for you:

input int a;

if the input stream size differs, or if you need to index it, add brackets:

input int a[];
"""

from tinygpu_lex import plexer

from tinygpu_ast import *
from tinygpu_parse import parser
plexer.lineno = 0
from tinygpu_typespace import *

class NoExtraArg:
  pass

INPUTS = "_inputs"
OUTPUTS = "_outputs"
CUR_I = "_cur_idx"
FRAME_SIZE = "_frm_siz"
START_I = "_start_idx"
OUTPUT_TMP = "_out_tmp"
INPUT_TMP = "_in_tmp_vec4" 

typeless_node_trees = [FuncArgsNode, ArrTypeNode]

def parse_intern(ctx):
  result = parser.parse(ctx.data, lexer=plexer)
  
  if glob.g_print_lex:
    plexer.input(ctx.data)
    tok = plexer.token()
    col = 20
    
    s = ""
    c = col
    while tok != None:
      l = str(tok.type) + " " + str(tok.value) + " " + str(tok.lineno)
      
      s += l
      
      c -= len(l)
      for i in range(c):
        s += " "
        
      if c <= 0:
        c = col
        s += "\n"
       
      tok = plexer.token()
    print(s)
  if glob.g_error:
    return

  def traverse(node, ntype, func, extra_arg=NoExtraArg, depth=0):
    if node == None: return
    
    for c in node.children:
      traverse(c, ntype, func, extra_arg, depth+1)
      
    if type(node) == ntype:
      if extra_arg == NoExtraArg:
        func(node, depth)
      else:
        func(node, depth, extra_arg)
    
  def gen_struct(node, ctx, scope=None, tlevel=0):
    t = ""
    for i in range(tlevel):
      t += "  "
    
    code = t + "struct %s {\n"%node.name
    for c in node.children:
      code += gen_code(c, ctx, scope, tlevel+1) + ";\n";      
    code += t + "}"
    return code
  
  def gen_unpack(node, ctx, scope, tlevel):
    tab = ""
    for i in range(tlevel):
      tab += "  "
      
    code = ""
    if type(node.children[0]) == BuiltinTypeNode:
      t = node.children[0].type
      n = node.name
      tmp = "_tmp"
      
      def lookup(i):
        start = node.children[0].start
        return "%s[%d]" % (n, start+i)
      
      def ref(i):
        return "(int)(" + lookup(i) + "*255.0)"
      if t == "int":
        code += "(%s | %s<<8 | %s<<16 | %s<<24)"%(ref(0), ref(1), ref(2), ref(3))
        
    return code
  
  def is_stream(node):
    return node.stream != None
  
  def is_int(n):
    try:
      int(n)
    except ValueError:
      return False
    return True
  
  def get_arr_depth(node):
    depth = 0
    while len(node.children) > 0:
      node = node.children[0]
      if type(node) in [ArrayRefNode, ArrTypeNode]:
        depth += 1
    return depth
  
  def  get_struct(struct, ctx, scope):
    if type(struct) == IdentNode or type(struct) == str:
      if type(struct) == IdentNode:
        n = struct.val
      else:
        n = struct
        
      if n in scope:
        return get_struct(scope[n], ctx, scope)
      elif n in ctx.types:
        return get_struct(ctx.types[n], ctx, scope)
    if type(struct) == VarDeclNode:
      return get_struct(struct.type, ctx, scope)
    elif type(struct) == TypeRefNode:
      return get_struct(struct.type, ctx, scope)
    elif type(struct) == ArrTypeNode:
      return get_struct(struct.type, ctx, scope)
    elif type(struct) == StructTypeNode:
      return struct

  def parenize(s):
    if not is_int(s):
      return "(%s)"%s
    else:
      return s

  def gen_expr(node, ctx, scope):
    code = ""
    
    if type(node) == ExprNode and len(node.children) > 0:
        code += gen_expr(node.children[0], ctx, scope)
    elif type(node) == StrLitNode:
      return '"%s"'%node.val
    elif type(node) in [PostInc, PostDec, PreInc, PreDec]:
      op = "--" if type(node) in [PostDec, PreDec] else "++"
      post = type(node) in [PostInc, PostDec]

      typename = ctx.get_type_name(node.children[0].ret_type, scope, convert_glsl_types=False);
      
      if typename in ctx.op_type_map:
        post = "post" if post else "pre"
        c1 = gen_expr(node.children[0]);
        return "(%s = %s_%s_%s(%s), %s_expr_tmp)" % (c1, ctx.builtin_type_map[typename], ctx.op_map[op], post, c1, ctx, scope, ctx.builtin_type_map[typename])
      else:
        if post:
          code += gen_expr(node.children[0], ctx, scope) + op
        else:
          code += op + gen_expr(node.children[0], ctx, scope)
    elif type(node) == FuncCallNode:
      name = gen_expr(node.children[0], ctx, scope)
      
      if name not in ctx.functions:
        ctx.error(node.line, "Could not find function %s"%name);
      
      func = ctx.functions[name]
      if func.glsl_builtin:
        name = func.glsl_name
      else:
        name = func.output_name
        
      code += "%s(" % name
      if len(node.children) > 1:
        code += gen_expr(node.children[1], ctx, scope)
      code += ")"
    elif type(node) == ExprListNode:
      for i, c in enumerate(node.children):
        if i != 0: code += ", "
        code += gen_expr(c, ctx, scope)
    elif type(node) == NegateNode:
      typename = ctx.get_type_name(node.children[0].ret_type, scope, convert_glsl_types=False);
      
      if typename in ctx.op_type_map:
        return "%s_negate(%s)" % (ctx.builtin_type_map[typename], gen_expr(node.children[0], ctx, scope))
      else:
        return "-" + gen_expr(node.children[0], ctx, scope)
    elif type(node) == IdentNode:
      if node.ret_type != None and node.ret_type.stream_type != None:
        code += str(node.ret_type.start)
      else:  
        code += node.val
    elif type(node) == NumLitNode:
      if node.ret_type != None and node.ret_type.type in ctx.op_type_map:
        return ctx.gen_num_lit(node, gen_expr, scope)
      else:
        return str(node.val)
    elif type(node) == BoolLitNode:
      return node.val
    elif type(node) == AssignNode:
      code += gen_assign(node, ctx, scope, 0)
    elif type(node) == NodeVarGroup:
      code += gen_expr(node.children[0], ctx, scope)
    elif type(node) == ArrayRefNode:
      stream_type_node = ctx.get_arr_stream_type(node)
      stream_type = stream_type_node.stream_type if stream_type_node != None else None
      
      if stream_type != None:
        name = ctx.get_type_name(stream_type, scope)
        
        if stream_type == "input":
          c1 = gen_expr(node.children[0], ctx, scope);
          c2 = gen_expr(node.children[1], ctx, scope);
          code += "get_input_%s(%s, %s)"%(name, c1, c2);
        elif stream_type == "output":
          add_paren = ctx.get_arr_stream_type(node.parent) == None
          
          c1 = gen_expr(node.children[0], ctx, scope);
          c2 = gen_expr(node.children[1], ctx, scope);
          
          if add_paren: code += "set_output("
          
          n3 = node
          dimstr = ""
          last_dimstr = ""
          while type(n3) == ArrayRefNode:
            last_dimstr = dimstr
            dimstr += "%s*"%str(n3.dim)
            n3 = n3.parent;
          
          dimstr = last_dimstr
          code += "%s + %s%s"%(parenize(c1), dimstr, parenize(c2))#"get_output_%s(%s, %s)"%(name, c1, c2);
          if add_paren: code += ", "
      else:
        code += gen_expr(node.children[0], ctx, scope)
        code += "[" + gen_expr(node.children[1], ctx, scope) + "]"
    elif type(node) == BinOpNode:
      code += ctx.gen_bin_expr(node, ctx, scope, gen_expr)
    
    return code
    
  def get_expr_type(node, ctx, scope):
    #print(type(node))
    
    if type(node) == NodeVarGroup:
      return get_expr_type(node.children[0], ctx, scope)
    elif isinstance(node, TypeNode):
      return node
    elif type(node) == IdentNode:
      if node.val in scope:
        return scope[node.val]
      elif node.val in ctx.globals:
        return ctx.globals[node.val]
      elif node.val in ctx.types:
        return ctx.types[node.val]
      else:
        return None
    elif type(node) == BinOpNode:
      if node.op == ".":
        return get_expr_type(node.children[1], ctx, scope)
    elif type(node) == ArrayRefNode:
      return get_expr_type(node.children[0], ctx, scope)

  def gen_assign(node, ctx, scope, tlevel):
    code = ""
    
    t = ""
    for i in range(tlevel):
      t += "  "
    
    stream = ctx.get_arr_stream_type(node.children[0])
    if stream != None and stream.stream_type == "output":
      #gen_expr builds a function call here, so not much to do except add
      #the second argument
      code += t + gen_expr(node.children[0], ctx, scope) + gen_expr(node.children[1], ctx, scope) + ")"
    else:
      n = node.children[0].ret_type
      
      if not types_match(n, node.children[1].ret_type, ctx, scope):
        ctx.error(node.line, "Invalid type in assignment");
      
      """      
      if type(n) == BuiltinTypeNode and n.type in ctx.op_type_map:
        c1 = gen_expr(node.children[0], ctx, scope)
        c2 = gen_expr(node.children[1], ctx, scope)
        
        code += t + "%s_assign(%s, %s)" % (ctx.op_type_map[n.type], c1, c2)
      else:
      """
      
      code += t + gen_expr(node.children[0], ctx, scope) + " = " + gen_expr(node.children[1], ctx, scope)
    
    return code
  
  def gen_function_code(node, ctx, scope, tlevel):
    t = ""
    for i in range(tlevel):
      t += "  "
    
    code = ""
    
    scope = create_function_scope(node, ctx, scope)
      
    code += t + "%s %s(%s) {\n" % (ctx.build_var_str(node.children[0]), node.output_name, gen_code(node.children[1], ctx, scope))
    for c in node.children[2:]:
      code += gen_code(c, ctx, scope, tlevel+1)
      
      if not code.strip().endswith("}"):
        code += ";"
      code += "\n"

    code += "}\n"
    
    return code
  
  def gen_for(node, ctx, scope, tlevel):
    code = ""
    
    t = ""
    for i in range(tlevel):
      t += "  "
    
    scope = dict(scope)

    n1 = gen_code(node.children[0].children[0], ctx, scope, 0)
    n2 = gen_code(node.children[0].children[1], ctx, scope, 0)
    n3 = gen_code(node.children[0].children[2], ctx, scope, 0)
    
    code += "\n" + t + "for (%s; %s; %s) {\n" % (n1, n2, n3)
    for c in node.children[1].children:
      code += gen_code(c, ctx, scope, tlevel+1) 
      if not code.strip().endswith("}"):
        code += ";"
        
      code += "\n"
      
    code += t + "}"
    
    return code
  
  def gen_ifelse(node, ctx, scope, tlevel):
    t = ""
    for i in range(tlevel):
      t += "  "
    
    code = ""
    if type(node) == IfNode:
      code += t + "if (%s)"%gen_expr(node.children[0], ctx, scope)
      if type(node.children[1]) != StatementList:
        code += "\n%s" % (gen_code(node.children[1], ctx, scope, tlevel+1))
      else:
        code += " {\n"
        
        for c in node.children[1].children:
          code += gen_code(c, ctx, scope, tlevel+1)
          if not code.strip().endswith("}"):
            code += ";"
          code += "\n"
        code += t + "}"
    elif type(node) == ElseNode:
      code = t + "else"
      if type(node.children[0]) != StatementList:
        if type(node.children[0]) not in [IfNode, ElseNode]:
          code += "\n"
          code +=  gen_code(node.children[0], ctx, scope, tlevel+1)
        else:
          code += gen_code(node.children[0], ctx, scope, tlevel)[tlevel:]
      else:
        code += " {\n"
        
        for c in node.children[0].children:
          code += gen_code(c, ctx, scope, tlevel+1)
          if not code.strip().endswith("}"):
            code += ";"
          code += "\n"
        code += t + "}"
        
    return code
    
  def gen_code(node, ctx, scope=None, tlevel=0):
    code = ""
    if scope == None: scope = {}
    
    t = ""
    for i in range(tlevel):
      t += "  "
    
    if type(node) == NodeVarGroup:
      code += gen_code(node.children[0], ctx, scope, tlevel);
    elif type(node) == StrLitNode:
      code += '"%s"'%node.val
    if type(node) in [IfNode, ElseNode]:
      code += gen_ifelse(node, ctx, scope, tlevel);
    elif type(node) == ReturnNode:
      code += t + "return " + gen_expr(node.children[0], ctx, scope) if len(node.children) > 0 else ""
    elif type(node) == ContinueNode:
      code += t + "continue"
    elif type(node) == BreakNode:
      code += t + "break"
    elif type(node) == StatementList:
        for c in node.children:
          if type(c) == NullStatement: continue
          code2 = gen_code(c, ctx, scope, tlevel)
          
          if code2.strip() != "":
            code += code2
            if not code.strip().endswith("}") and not code.strip().endswith(";"):
              code += ";"
            
            code += "\n"
    elif type(node) == StructTypeNode:
      code += gen_struct(node, ctx, scope, tlevel) + ";";
    elif type(node) == IdentNode:
      return node.val
    elif type(node) == VarDeclNode:
      scope[node.name] = node
      mods = ""
      
      modslist = list(node.children[0].modifiers)
      for m in modslist[:]:
        if m == "uniform":
          modslist.remove(m)
          modslist = [m] + modslist
          
      for m in modslist:
        mods += m + " "
      
      if "input" not in mods and "output" not in mods:
        code += t + mods + ctx.build_var_str(node)
        
        if len(node.children) > 1:
          if not types_match(node.type.ret_type, node.children[1].ret_type, ctx, scope):
            ctx.error(node.line, "Type mismatch")
          code += "=%s" % gen_code(node.children[1], ctx, scope);
      elif "input" in mods:
        code += t + "uniform sampler1d %s_sampler"%node.name        
    elif type(node) == FunctionNode and not node.glsl_builtin:
      code += gen_function_code(node, ctx, scope, tlevel);
    elif type(node) == FuncArgsNode:
      code += ctx.get_type_name(node.children[1]) + " " + ctx.build_var_str(node.children[0])

      for c in node.children[2:]:
        if len(node.children) > 1:
          code += ", "
        code += gen_code(c, ctx, scope, tlevel) # ctx.get_type_name(c.children[0])

    elif type(node) == AssignNode:
      code += gen_assign(node, ctx, scope, tlevel)
    elif type(node) in [ExprNode, ExprListNode, FuncCallNode, BinOpNode,\
                        NegateNode, PostInc, PostDec, PreInc, PreDec, \
                        ArrayRefNode, NumLitNode]:
      code += t + gen_expr(node, ctx, scope)
    elif type(node) == ForLoopNode:
      code += gen_for(node, ctx, scope, tlevel)
    elif type(node) == BoolLitNode:
      return node.val
    elif type(node) == NumLitNode:
      return ctx.gen_num_lit(node, scope, gen_expr);
      
    return code
  
  def recurse_stream_data(node, ctx, datalist, stype, start=-1, auto_index=True):
    if start == -1:
      start = len(datalist)
    
    # node.start is absolute position in stream array
    # *if* it's a top-level node, otherwise it's a member
    # offset
    if type(node) == VarDeclNode:
      node.stream_type = stype
    node.start = start
    node.size = len(datalist)
    
    #print(type(node))
    if type(node) != BuiltinTypeNode:
      if type(node) == ArrTypeNode:
        arrsize = node.dim
        
        if node.dim == 0: auto_index = True
        
        for c in node.children:
          if c.dim == 0: auto_index = True
          else: arrsize *= c.dim
        
        if node.dim == 0:
          recurse_stream_data(node.type, ctx, datalist, stype, start, auto_index)
        else:
          for i in range(int(arrsize)):
            recurse_stream_data(node.type, ctx, datalist, stype, start, auto_index)
      elif type(node) == StructTypeNode:
        offset = 0
        for c in node.children:
          recurse_stream_data(c, ctx, datalist, stype, offset, auto_index)
          offset += c.size
          
      elif type(node) == VarDeclNode:
        recurse_stream_data(node.children[0], ctx, datalist, stype, start, auto_index)
      
      node.size = len(datalist) - node.size
      return node.start, node.size
      
    elif type(node) == BuiltinTypeNode:
      sizes = {"int": 1, "float16": 1, "float": 1, "byte": 1, "short": 1, "double": 1}
      auto_index = True
      size = sizes[node.type]
      
      node.auto_index = auto_index;
      
      for i in range(size):
        datalist.append([i, node])
      
    node.size = len(datalist) - node.size
    return node.start, node.size
    
  def process_structs(node, ctx, scope=None):
    if scope == None: scope = {}
    
    if type(node) == NodeVarGroup:
      process_structs(node.children[0], ctx, scope)
    elif type(node) == StatementList:
      for c in node.children:
        process_structs(c, ctx, scope)
    elif type(node) == StructTypeNode:
      ctx.types[node.name] = node
      ctx.structs[node.name] = node
      node.members = {}
      for c in node.children:
        process_structs(c, ctx, scope)
        node.members[c.name] = c.type
        
    elif type(node) == VarDeclNode:
      if type(node.children[0]) == TypeRefNode:
        if node.type.type not in ctx.types:
          ctx.error(node.line, "Could not find type %s"%node.type.type)
        node.children[0] = node.type = ctx.types[node.type.type]
      else:
        process_structs(node.children[0], ctx, scope)
    elif type(node) == ArrTypeNode:
      if type(node.type) == TypeRefNode:
        if node.type.type not in ctx.types:
          ctx.error(node.line, "Invalid type %s"%node.type.type)
        node.type = ctx.types[node.type.type]
      else:  
        process_structs(node.type, ctx, scope)
  
  def print_datalist(datalist):
    s = "["
    
    for i, item in enumerate(datalist):
      if i != 0: 
        s+= ", "      
      s += "%i" % (item[0])      
    s += "]"
    return s
  def process_types(node, ctx, inputs=None, outputs=None):
    if inputs == None: inputs = []
    if outputs == None: outputs = []
    
    if type(node) == NodeVarGroup:
      process_types(node.children[0], ctx, inputs, outputs)
    elif type(node) == StatementList:
      for c in node.children:
        process_types(c, ctx, inputs, outputs)
    elif type(node) == StructTypeNode:
      for c in node.children:
        process_types(c, ctx, inputs, outputs)
    elif type(node) == VarDeclNode:
      if "input" in node.modifiers:
        recurse_stream_data(node, ctx, inputs, "input")
        
      if "output" in node.modifiers:
        recurse_stream_data(node, ctx, outputs, "output")
        
    return inputs, outputs
  
  def nest_stream_variables(node, ctx, depth=0):
    if node.parent == 0:
      for c in node.children:
        nest_stream_variables(c, ctx)
      return
    
    n_stype = node.s_type
    p_stype = node.parent.s_type
    
    tab = ""
    for i in range(depth):
      tab += " "
    
    is_bound = False
    
    
    if n_stype != p_stype and type(n_stype) != NumLitNode:
      is_bound = True
    
    if is_bound:
      ci = node.parent.children.index(node)
      
      node2 = NodeVarGroup()
      node2.s_type = node.s_type
      
      if hasattr(node, "modifiers"):
        node2.modifiers = node.modifiers
      if hasattr(node, "type"):
        node2.type = node.type
      
      node2.parent = node.parent
      node.parent.children[ci] = node2
      
      node2.add(node)
        
    for c in node.children:
      nest_stream_variables(c, ctx, depth+1)
    
    """
    if type(c) not in [BinOpNode, ArrayRefNode]:
      for c in node.children:
        nest_stream_variables(c, sd, depth+1)
    else:
      if type(node) == IdentNode:
          sd.append(node)
    """
    
    pass
     
  def create_function_scope(node, ctx, scope):
    scope = dict(scope)
    if len(node.children[1].children) > 0:
      scope[ctx.get_var_name(node.children[1].children[0])] = node.children[1].children[1];

      for c in node.children[1].children[2:]:
        scope[ctx.get_var_name(c.children[0])] = c.children[1];

    return scope
    
  def types_match(t1, t2, ctx, scope):
    if type(t1) == VarDeclNode:
      t1 = t1.ret_type2
    if type(t2) == VarDeclNode:
      t2 = t2.ret_type2
      
    if type(t1) == TypeRefNode:
      t1 = ctx.get_type(t1.type, scope, t1.line)
    if type(t2) == TypeRefNode:
      t2 = ctx.get_type(t2.type, scope, t2.line)
    
    t1n = ctx.get_type_name(t1)
    t2n = ctx.get_type_name(t2)
    if t1n in ctx.builtin_type_map and t2n == ctx.builtin_type_map[t1n]: return True
    if t2n in ctx.builtin_type_map and t1n == ctx.builtin_type_map[t2n]: return True
    
    if type(t1) != type(t2): return False
    elif type(t1) == StrLitNode and type(t2) == StrLitNode:
      return True
    elif type(t1) == BuiltinTypeNode and type(t2) == BuiltinTypeNode:
      return t1.type == t2.type;
    elif type(t1) == StructTypeNode or type(t2) == StructTypeNode:
      return t1 == t2
    elif type(t1) == ArrTypeNode and type(t2) == ArrTypeNode:
      if t1.dim != t2.dim or len(t1.children) != len(t2.children): 
        return False
      while len(t1.children) > 0:
        t1 = t1.children[0]
        if len(t2.children) == 0: return False
        if t1.dim != t2.dim: return False
      return True
    else:
      return False
      
  def set_expr_types(node, ctx, scope, array_depth=-1):
    if scope == None: scope = {}
    expr_types = [ExprNode, ExprListNode, BinOpNode, ArrayRefNode, IdentNode, NumLitNode, BoolLitNode]

    if type(node) == VarDeclNode:
      node.ret_type = node
      node.ret_type2 = set_expr_types(node.type, ctx, scope)

      scope[node.name] = node.ret_type
      set_expr_types(node.children[0], ctx, scope)
      
      if len(node.children) > 1:
        set_expr_types(node.children[1], ctx, scope)
        
      return node.ret_type
    elif type(node) == StrLitNode:
      node.ret_type = node
      return node.ret_type
    elif type(node) == BuiltinVarDeclNode:
      node.ret_type = node
      node.ret_type2 = set_expr_types(node.type, ctx, scope)

      set_expr_types(node.children[0], ctx, scope)
      if len(node.children) > 1:
        set_expr_types(node.children[1], ctx, scope)
        
      return node.ret_type
    elif type(node) == TypeRefNode:
      node.ret_type = node
      return node.ret_type
    elif type(node) == NegateNode:
      node.ret_type = set_expr_types(node.children[0], ctx, scope)
      return node.ret_type
    elif type(node) == IdentNode:
      if node.val in scope:
        t = scope[node.val]
      elif node.val in ctx.globals:
        t = ctx.globals[node.val]
      elif node.val in ctx.types:
        t = ctx.types[node.val]
      else:
        ctx.error(node.line, "Undeclared variable %s"%node.val)
      
      if t == None:
        ctx.error(node.line, "Corrupted type information for variable %s"%node.val)
        
      node.ret_type = t
      return t
    elif type(node) == ArrTypeNode:
      node.ret_type = node
      set_expr_types(node.type, ctx, scope)
      
      for c in node.children:
        set_expr_types(c, ctx, scope)
      
      return node.ret_type
    elif type(node) == BuiltinTypeNode:
      node.ret_type = node
      return node.ret_type
    elif type(node) == BoolLitNode:
      node.ret_type = BuiltinTypeNode("bool")
      return node.ret_type
    elif type(node) == NumLitNode:
      if node.ret_type == None:
        node.ret_type = BuiltinTypeNode("int" if type(node.val) == int else "float")
        node.ret_type.parent = node
      return node.ret_type
    elif type(node) == StructTypeNode:
      node.ret_type = node
      return node.ret_type
    elif type(node) == AssignNode:
      t1 = set_expr_types(node.children[0], ctx, scope)
      t2 = set_expr_types(node.children[1], ctx, scope)
      
      if (type(t2.parent) == NumLitNode):
        if type(t1) == VarDeclNode:
          t2.ret_type = t1.ret_type2.type
        else:
          t2.ret_type = t1.type
      
      if not types_match(t1, t2, ctx, scope):
        ctx.error(node.line, "Type mismatch")      
        
      node.ret_type = t1;
      return t1
    elif type(node) in [ExprNode, ExprListNode]:
      last_t = UnkownTypeNode()
      for c in node.children:
        t = set_expr_types(c, ctx, scope)
        last_t = t
        
      node.ret_type = last_t
      return last_t
    elif type(node) == ArrayRefNode:
      if array_depth == -1: array_depth = 0
      
      t1 = set_expr_types(node.children[0], ctx, scope, array_depth+1)
      t2 = set_expr_types(node.children[1], ctx, scope, array_depth+1)
      
      if type(t1) in [VarDeclNode, BuiltinVarDeclNode]:
        t1 = t1.type
      
      while type(t1) != ArrTypeNode and t1 not in [None, 0]:
        t1 = t1.parent
        
      if type(t1) != ArrTypeNode:
        ctx.error(node.line, "Invalid array")
      
      t3 = set_expr_types(t1.type, ctx, scope, array_depth+1);
      node.ret_type = t3
      
      return node.ret_type    
    elif type(node) == BinOpNode:
      t1 = set_expr_types(node.children[0], ctx, scope)
      
      s = get_struct(t1, ctx, scope)
      if s != None:
        scope = dict(scope)
        for k in s.members:
          scope[k] = s.members[k].ret_type if s.members[k].ret_type != None else set_expr_types(s.members[k], ctx, scope)
          
      t2 = set_expr_types(node.children[1], ctx, scope)
      
      node.ret_type = ctx.resolve_binop_type(t1, t2, node.op, scope)

      return node.ret_type
    elif type(node) == FunctionNode:
      set_expr_types(node.children[0], ctx, scope)
      ctx.types[node.name] = node.children[0].ret_type
      ctx.functions[node.name] = node
      
      if not node.glsl_builtin:
        #create local function scope
        scope = create_function_scope(node, ctx, scope)

        for c in node.children[1:]:
          if type(c) not in typeless_node_trees:
            if c.ret_type == None:
              set_expr_types(c, ctx, scope)

      node.ret_type = node.children[0].ret_type
      return node.ret_type
    elif type(node) == FuncCallNode:
      if type(node.children[0]) != IdentNode:
        ctx.error("Bad function call")
      
      name = node.children[0].val
      if name not in ctx.functions:
        ctx.error(node.line, "Invalid function %s" % name)
      
      func = ctx.functions[name]
      
      fa = func.children[1]
      
      arg_types = [fa.children[1]] if len(fa.children) > 1 else []
      for a in fa.children[2:]:
        arg_types.append(a.children[1])
        
      #if len(node.children[1]) 
      for c in node.children:
        set_expr_types(c, ctx, scope)
      
      if len(arg_types) != len(node.children[1].children):
        ctx.error(node.line, "Invalid number of arguments, got %i, expected %i" %(len(node.children[1].children), len(arg_types)))
        
      for i, c in enumerate(node.children[1].children):
        if not types_match(c.ret_type, arg_types[i], ctx, scope):
          if not (type(c.ret_type.parent) == NumLitNode and \
              type(arg_types[i]) == BuiltinTypeNode):
            ctx.error(node.line, "Invalid argument type in function call")
          
        c.ret_type = arg_types[i]
      
      node.ret_type = ctx.types[name];
      return node.ret_type
    else:
      if node == None or type(node) == int: return
      for c in node.children:
        if type(c) not in typeless_node_trees:
          set_expr_types(c, ctx, scope)
  
  def tab(ti, tstr='  '):
    t = ""
    for i in range(ti):
      t += tstr
    return t
    
  def set_array_ref_dims(node, ctx, scope=None, arr_depth=-1, depth=0):
    if scope == None: scope = {}
    
    #print(tab(depth, ' '), type(node))
    
    if type(node) == ArrayRefNode:
      if arr_depth == -1: arr_depth = 0
      t = set_array_ref_dims(node.children[0], ctx, scope, arr_depth+1, depth=depth+1)
      t2 = t
      for i in range(arr_depth):
        t2 = t2.children[0]
      
      node.dim = t2.dim
      return t
    if type(node) == ArrTypeNode:
      return node
    elif type(node) == BuiltinTypeNode:
      return node
    elif type(node) == BoolLitNode:
      return BuiltinTypeNode("bool")
    elif type(node) == NumLitNode:
      ntype = "int" if type(node.val) == int else "float"
      ntype = BuiltinTypeNode(ntype)
      ntype.parent = node
      
      return ntype
    elif type(node) == StructTypeNode:
      return node
    elif type(node) == BinOpNode:
      if node.op == ".":
        s = get_struct(node.children[0].ret_type, ctx, scope)
        if s == None:
          ctx.error(node.line, "Invalid type for . member lookup operation")
        
        scope = dict(scope)
        for k in s.members:
          scope[k] = s.members[k].ret_type
          
      t1 = set_array_ref_dims(node.children[0], ctx, scope, depth=depth+1)
      t2 = set_array_ref_dims(node.children[1], ctx, scope, depth=depth+1)
      
      while type(t2) != ArrTypeNode and t2 not in [0, None]:
        t2 = t2.parent
     
      return t2 if type(t2) == ArrTypeNode else t1
    elif type(node) == IdentNode and type(node.parent) != FuncArgsNode:
      return set_array_ref_dims(ctx.get_type(node.val, scope, node.line), ctx, scope, depth=depth+1)
    elif type(node) in [VarDeclNode]:
      scope[node.name] = node.ret_type
      return set_array_ref_dims(node.children[0], ctx, scope, depth=depth+1)
    elif type(node) == BuiltinVarDeclNode:
      return set_array_ref_dims(node.children[0], ctx, scope, depth=depth+1)
    elif type(node) == FunctionNode:
      if not node.glsl_builtin:
        scope = create_function_scope(node, ctx, scope)
      
      for c in node.children:
        set_array_ref_dims(c, ctx, scope, depth=depth+1)
    elif type(node) == FuncCallNode:
      for c in node.children:
        set_array_ref_dims(c, ctx, scope, depth=depth+1)
      return node.ret_type
    elif node != None:
      for c in node.children:
        set_array_ref_dims(c, ctx, scope, depth=depth+1)
          
    
  def print_expr_types(node, depth=0):
    tab = ""
    for i in range(depth):
      tab += " "
      
      if node.ret_type != None:
        print(tab + node.get_type_name() + " " + node.extra_str() + ", type: " + node.ret_type.get_type_name() + " " + node.ret_type.extra_str())
      
    for c in node.children:
      print_expr_types(c, depth+1)
      
  def print_expr_group_types(node, depth=0):
    tab = ""
    for i in range(depth):
      tab += " "
    
    if node.s_type != None:
      print(tab + node.get_type_name() + " " + node.extra_str() + ", type: " + node.s_type.get_type_name() + " " + node.s_type.extra_str())
      
    for c in node.children:
      print_expr_group_types(c, depth+1)   
      
  def set_vardecl_modifiers(node, depth):
    node.modifiers = node.children[0].modifiers
  
  def unpack_complex_assign(node, depth):
    if node.mode == "=": return
    
    op = node.mode.replace("=", "")
    
    n1, n2 = node.children[:2]
    node.children.remove(n2)
    
    node.mode = "="
    bnode = BinOpNode(n1, n2, op)

    node.add(bnode)
  
  #GLSL uses a structname(member1, member2...) initialization
  #scheme, so we have to add the struct initializaiton functions to the
  #type system
  def create_struct_init_functions(node, ctx):
    for k in ctx.structs.keys():
      s = ctx.structs[k]
      
      if len(s.children) > 0:
        farg = FuncArgsNode(IdentNode(s.children[0].name))
        farg.add(s.children[0].children[0])
        for c in s.children[1:]:
          farg2 = FuncArgsNode(IdentNode(c.name))
          farg2.add(c.children[0])
          farg.add(farg2)
      else:
        farg = ExprNode([])
      
      func = FunctionNode(k)
      tref = TypeRefNode(s)
      func.add(tref)
      func.add(farg)
      func.glsl_builtin = True
      
      ctx.functions[k] = func
  
  def node_set_scope(node, ctx, scope):
    if type(node) == FunctionNode:
      scope = create_function_scope(node, ctx, scope)
    elif type(node) == VarDeclNode:
      scope[ctx.get_var_name(node)] = node
    elif type(node) == BinOpNode and node.op == ".":
      scope = dict(scope)
      snode = ctx.get_type(ctx.get_var_name(node.children[0]), scope, node.line)
      
      if type(snode) == VarDeclNode:
        snode = snode.type
      if type(snode) == TypeRefNode:
        snode = ctx.get_type(snode.type, scope, node.line)
      
      if type(snode) != StructTypeNode:
        ctx.error(node.line, "Can't lookup members on non-structs")
        
      for k in snode.members:
        scope[k] = snode.members[k].ret_type
    return scope
  
  def get_funccall_arg_types(node, ctx, scope):
    name = node.children[0].val
    if name not in ctx.functions:
      ctx.error(node.line, "Invalid function %s" % name)
    
    func = ctx.functions[name]
    
    fa = func.children[1]
    
    arg_types = [fa.children[1]] if len(fa.children) > 1 else []
    for a in fa.children[2:]:
      arg_types.append(a.children[1])
    
    return arg_types
    
  def set_numlit_types(node, ctx, scope=None, f_type="float16"):
    if scope == None: scope = {}
    
    def find_type_in_leaves(n, scope):
      scope = node_set_scope(node, ctx, scope)
      
      if type(n) == IdentNode:
        t = ctx.get_type_name(ctx.get_type(n.val, scope, n.line), scope, convert_glsl_types=False)
        
        if t in ["float", "float16", "int"]:
          return t
        else:
          return f_type
      elif type(n) == ExprNode:
        for c in n.children:
          t = find_type_in_leaves(c, scope)
          if t != f_type: return t
        return f_type
      elif type(n) == ArrTypeNode:
        return find_type_in_leaves(n.type, scope)
      elif type(n) == ArrayRefNode:
        return find_type_in_leaves(n.children[0], scope)
      elif type(n) == NumLitNode:
        return f_type
      elif type(n) == BuiltinTypeNode:
        return n.type
      elif type(n) == NegateNode:
        return find_type_in_leaves(n.children[0], scope)
      elif type(n) == FuncCallNode:
        name = gen_expr(n.children[0], ctx, scope)
        
        if name not in ctx.functions:
          ctx.error(n.line, "Could not find function %s"%name);
        
        func = ctx.functions[name]
        
        return find_type_in_leaves(func.children[0], scope)
      elif type(n) == BinOpNode:
        t1 = find_type_in_leaves(n.children[0], scope)
        t2 = find_type_in_leaves(n.children[1], scope)
        
        if n.op == ".":
          return t2

        return t1 if t1 != f_type else t2
      elif n != None:
        ret = f_type
        for c in n.children:
          t = find_type_in_leaves(c, scope)
          if t != f_type and t != None:
            return t
        return ret
        
      #"""
      if n != None:
        print(":", n.get_type_name())
      else:
        print(None)
      #"""
      return f_type 

        #set number literals to either 32-bit emulated floats,
    #or native hardware 16-bit ones.
    
    scope = node_set_scope(node, ctx, scope)
    
    if type(node) == NumLitNode:
      if f_type != "int":
        node.val = float(node.val)
      node.ret_type = BuiltinTypeNode(f_type)
      node.ret_type.parent = node
    elif type(node) == VarDeclNode:
      f_type = find_type_in_leaves(node.type, scope)
    elif type(node) == AssignNode:
      f_type = find_type_in_leaves(node.children[0], scope)
    elif type(node) == BinOpNode:
      t = find_type_in_leaves(node, scope)
      
      set_numlit_types(node.children[0], ctx, scope, t)
      set_numlit_types(node.children[1], ctx, scope, t)
      
      f_type = t   

    #these if's override node traversals, unlike the above if statements
    if type(node) == FuncCallNode:
      args = get_funccall_arg_types(node, ctx, scope)
      
      if len(node.children[1].children) != len(args):
        ctx.error(node.line, "Wrong number of function arguments")
        
      for i, c in enumerate(node.children[1].children):
        if type(args[i]) == BuiltinTypeNode and args[i].type in ["float", "float16"]:
          f_type2 = args[i].type
        else:
          f_type2 = f_type
        
        set_numlit_types(c, ctx, scope, f_type2)  
    elif type(node) == ArrayRefNode:
      t = find_type_in_leaves(node.children[0], scope)
      set_numlit_types(node.children[0], ctx, scope, "float16")
      
      #we don't use emulated data types in array lookups
      set_numlit_types(node.children[1], ctx, scope, "int")
    else:
      for c in node.children:
        set_numlit_types(c, ctx, scope, f_type)
  
  def find_function_nodes(node, depth):
    ctx.functions[node.name] = node
  
  def set_builtin_globals(node, depth):
    ctx.globals[node.name] = node.type
    
  traverse(result, AssignNode, unpack_complex_assign)
  traverse(result, VarDeclNode, set_vardecl_modifiers)
  traverse(result, FunctionNode, find_function_nodes)
  traverse(result, BuiltinVarDeclNode, set_builtin_globals)

  process_structs(result, ctx)
  
  create_struct_init_functions(result, ctx)
  
  inputs, outputs = process_types(result, ctx)
  
  #create global to store the total number of elements in each logical
  #output stream cell
  vnode = VarDeclNode(BuiltinTypeNode("float16"), "g_total_out");
  vnode.ret_type2 = vnode.type
  
  litnode = NumLitNode(float(len(outputs)))
  litnode.ret_type = BuiltinTypeNode("float16")
  
  vnode.add(litnode)
  
  result.children.insert(0, vnode);
  ctx.globals["g_total_out"] = vnode;
  
  ctx.inputs = inputs
  ctx.outputs = outputs
  
  print("\n")
  #print(result)
  print("\n")

  set_numlit_types(result, ctx)
  set_expr_types(result, ctx, {})
  
  set_array_ref_dims(result, ctx)
  
  
  #print(result)
  print("\n")

  if glob.g_print_tree:
    print(result)
  ret = gen_code(result, ctx)
  
  #"""
  if glob.g_print_output:
    lines = ret.split("\n")
    for i, l in enumerate(lines):
      print("%i: %s" %(i+6, l))
  #"""
  
  return ret, result, ctx
  
def parse(data):
  ctx = TypeSpace(data)
  
  try:
    return parse_intern(ctx)
  except GSParseError:
    if glob.g_print_parser_stacktrace:
      import traceback as tb
      tb.print_stack()
      tb.print_exc()
      
    glob.g_parse_failed = True;
    ctx.print_errors()

def strip_rslash(path):
  while path.endswith(os.path.sep):
    path = path[:-1]
  return path
  
def main(argv):
  files = []
  
  dir = strip_rslash(os.path.abspath(os.getcwd()))
  
  if not dir.endswith(os.path.sep+"tinygpu"):
    while not dir.endswith(os.path.sep+"allshape") and len(dir) > 0 \
          and dir != os.path.sep and dir != "c:\\":
      if dir.rfind(os.path.sep) == -1: break
      dir = dir[:dir.rfind(os.path.sep)]
    
    if not dir.endswith(os.path.sep+"allshape"):
      print("Could not find base directory")
      return -1
    
    dir += os.path.sep + "tinygpu"
    os.chdir(dir);
    
  for a in argv[1:]:
    if a.strip().lower() == "--print-out" or a.strip().lower() == "-v":
      glob.g_print_output = True
    elif a.strip().lower() == "-t" or a.strip().lower() == "--print-tree":
      glob.g_print_tree = True
    elif a.strip().lower() == "-l" or a.strip().lower() == "--print-lex-tokens":
      glob.g_print_lex = True
    elif a.strip().lower() == "--pause":
      glob.g_pause_at_end = True
    elif a.strip().startswith("--make-test="):
      glob.g_make_test = True
      glob.g_test_outpath = a.strip()[len("--make_test="):]
    elif a.strip().startswith("--msvc-errors"):
      glob.g_print_msvc_errors = True
    else:
      files.append(a)
  
  if len(files) == 0:
    files.append("tinygpu_mathlib.tg")
    files.append(".."+os.path.sep+"gpu_test.gs")
  
  for i in range(len(files)):
    files[i] = os.path.normpath(os.path.abspath(files[i]))
    files[i] = os.path.relpath(files[i])
    
  glob.files = files
  
  data = ""
  for f in files:
    file = open(f, "r")
    data += file.read() + "\n"
    file.close()

  ret = parse(data)
  if ret != None:
    ret, ntree, ctx = ret
    
  if ret != None and ".."+os.path.sep+"gpu_test.gs" in files:
    file = open("tinygpu_test.html.in", "r")
    buf = file.read()
    file.close()
    
    buf = buf.replace("SHADER_HERE", ret)

    print("Writing tinygpu_test.html...")
    file = open(".."+os.path.sep+"tinygpu_test.html", "w")
    file.write(buf)
    file.close()
    
    print("Writing js_build/tinygpu_test.html...")
    file = open(".."+os.path.sep+"js_build"+os.path.sep+"tinygpu_test.html", "w")
    file.write(buf)
    file.close()
    
  if ret != None and glob.g_make_test:
    print("Writing c++ test file at %s..."%glob.g_test_outpath);
    from tinygpu_cpp_test import gen_cpp_code
    
    ret = gen_cpp_code(ntree, ctx);
    file = open(glob.g_test_outpath, "w")
    file.write(ret);
    file.close()
    
  return 1
  
if __name__ == "__main__":
  ret = 1
  
  try:
    ret = main(sys.argv)
    if glob.g_parse_failed:
      sys_exit(-1)
  except:
    import traceback
    
    stack = traceback.format_stack() + [traceback.format_exc()]
    s = ""
    for l in stack:
      l = l.replace("C:\\Users\\JoeEagar\\Google Drive\\WebGL\\tinygpu\\", "")
      s += l
    
    sys.stderr.write(s + "\n")
    sys.exit(-1)
    
  if glob.g_pause_at_end:
    os.system("PAUSE")
  
  sys.exit(ret)
