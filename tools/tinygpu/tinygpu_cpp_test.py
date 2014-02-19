from tinygpu_ast import *

def tab(i, tstr="  "):
  t = ""
  for i in range(i):
    t += tstr
  return t

def create_function_scope(node, ctx, scope):
  scope = dict(scope)
  if len(node.children[1].children) > 0:
    scope[ctx.get_var_name(node.children[1].children[0])] = node.children[1].children[1];

    for c in node.children[1].children[2:]:
      scope[ctx.get_var_name(c.children[0])] = c.children[1];

  return scope
  
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
  
def endstatement(code):
  if code == "": return ""
  
  if code.strip().endswith("}")==0 and code.strip().endswith(";") == 0 \
     and code.strip().endswith(";\n")==0:
    code += ";"
  if code.endswith("\n") == 0:
    code += "\n"
  return code

def gen_for(node, ctx, scope, tlevel):
  code = ""
  
  t = ""
  for i in range(tlevel):
    t += "  "
  
  scope = dict(scope)

  n1 = gen_cpp(node.children[0].children[0], ctx, scope, 0)
  n2 = gen_cpp(node.children[0].children[1], ctx, scope, 0)
  n3 = gen_cpp(node.children[0].children[2], ctx, scope, 0)
  
  code += "\n" + t + "for (%s; %s; %s) {\n" % (n1, n2, n3)
  for c in node.children[1].children:
    code += gen_cpp(c, ctx, scope, tlevel+1) 
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
    code += t + "if (%s)"%gen_cpp(node.children[0], ctx, scope)
    if type(node.children[1]) != StatementList:
      code += "\n%s" % (gen_cpp(node.children[1], ctx, scope, tlevel+1))
    else:
      code += " {\n"
      
      for c in node.children[1].children:
        code += gen_cpp(c, ctx, scope, tlevel+1)
        if not code.strip().endswith("}"):
          code += ";"
        code += "\n"
      code += t + "}"
  elif type(node) == ElseNode:
    code = t + "else"
    if type(node.children[0]) != StatementList:
      if type(node.children[0]) not in [IfNode, ElseNode]:
        code += "\n"
        code +=  gen_cpp(node.children[0], ctx, scope, tlevel+1)
      else:
        code += gen_cpp(node.children[0], ctx, scope, tlevel)[tlevel:]
    else:
      code += " {\n"
      
      for c in node.children[0].children:
        code += gen_cpp(c, ctx, scope, tlevel+1)
        if not code.strip().endswith("}"):
          code += ";"
        code += "\n"
      code += t + "}"
      
  return code
    
def gen_cpp(node, ctx, scope, tlevel=0):
  code = ""
  t = tab(tlevel);
  
  scope = node_set_scope(node, ctx, scope)
  
  if type(node) == StatementList:
    for c in node.children:
      code += endstatement(gen_cpp(c, ctx, scope, tlevel))
  elif type(node) == IdentNode:
    code = node.val
  elif type(node) == StrLitNode:
    code = '"%s"'%node.val
  elif type(node) == NumLitNode:
    tname = ctx.get_type_name(node, convert_glsl_types=False)
    
    if tname == "float16":
      code += "float16_new(%f)"%node.val
    else:
      code = ctx.gen_num_lit(node, gen_cpp, scope).replace("f32(", "f32_struct_new(")
  elif type(node) == BoolLitNode:
    code = node.val
  elif type(node) == FuncCallNode:
    fname = node.children[0].val
    if fname in ctx.structs or fname in ["vec2", "vec3", "vec4", "mat4"]:
      fname += "_struct_new"
    else:
      func = ctx.functions[fname]
      
      if 0: #func.glsl_builtin:
        fname = func.glsl_name
      else:
        fname = func.output_name
    
    code = t + fname + "("
    for i, c in enumerate(node.children[1].children):
      if i != 0: code += ", "
      code += gen_cpp(c, ctx, scope, 0)
    code += ")"
  elif type(node) == StructTypeNode:
    code += t + "typedef struct %s {\n" % (node.name)
    for c in node.children:
      code += tab(tlevel+1) + endstatement(gen_cpp(c, ctx, scope, 0));
    code += t + "} %s;\n"%node.name
    code += gen_struct_init_function(node.name, ctx)
    
  elif type(node) in [VarDeclNode, BuiltinVarDeclNode]:
    if "uniform" not in node.modifiers and "attribute" not in node.modifiers \
      and "input" not in node.modifiers and "output" not in node.modifiers:
      code = t + ctx.build_var_str(node, node.name)
      if len(node.children) > 1:
        code += "=" + gen_cpp(node.children[1], ctx, scope, 0)
  elif type(node) == FunctionNode and not node.glsl_builtin:
    code += "%s %s(" % (ctx.build_var_str(node.children[0]), node.output_name)
    
    if len(node.children[1].children) > 0:
      c = node.children[1]
      args = [ctx.build_var_str(c.children[1], " " + c.children[0].val)]
      
      for c in c.children[2:]:
        args.append(ctx.build_var_str(c.children[1], " " + c.children[0].val))
        
      for i, arg in enumerate(args):
        if i != 0:
          code += ", "
        code += arg
    code += ")\n%s{\n" % t
    for c in node.children[2:]:
      code += endstatement(gen_cpp(c, ctx, scope, tlevel+1));
    code += t + "}\n\n"
  elif type(node) == ArrTypeNode:
    if node.builtin_name != None:
      code = node.builtin_name
    else: 
      code = "[%i]" % node.dim
      for c in node.children:
        code += gen_cpp(c, ctx, scope, 0)
  elif type(node) == BinOpNode:
    return ctx.gen_bin_expr(node, ctx, scope, gen_cpp)
  elif type(node) == NegateNode:
    typename = ctx.get_type_name(node.children[0].ret_type, scope, convert_glsl_types=False);
    
    if typename in ctx.op_type_map:
      return "%s_negate(%s)" % (ctx.builtin_type_map[typename], gen_cpp(node.children[0], ctx, scope))
    else:
      return "-" + gen_cpp(node.children[0], ctx, scope)
  elif type(node) in [PostInc, PostDec, PreInc, PreDec]:
    op = "--" if type(node) in [PostDec, PreDec] else "++"
    post = type(node) in [PostInc, PostDec]

    typename = ctx.get_type_name(node.children[0].ret_type, scope, convert_glsl_types=False);
    
    if typename in ctx.op_type_map:
      post = "post" if post else "pre"
      c1 = gen_cpp(node.children[0]);
      return "(%s = %s_%s_%s(%s), %s_expr_tmp)" % (c1, ctx.builtin_type_map[typename], ctx.op_map[op], post, c1, ctx, scope, ctx.builtin_type_map[typename])
    else:
      if post:
        code += gen_cpp(node.children[0], ctx, scope) + op
      else:
        code += op + gen_cpp(node.children[0], ctx, scope)
  elif type(node) == ArrayRefNode:
    code += gen_cpp(node.children[0], ctx, scope)
    code += "[%s]" % gen_cpp(node.children[1], ctx, scope)
  elif type(node) == AssignNode:
    code = t + gen_cpp(node.children[0], ctx, scope)
    code += "=" + gen_cpp(node.children[1], ctx, scope)
  elif type(node) == ForLoopNode:
    code += gen_for(node, ctx, scope, tlevel)
  elif type(node) in [IfNode, ElseNode]:
    code += gen_ifelse(node, ctx, scope, tlevel)
  elif type(node) == ReturnNode:
    code += t + "return"
    if len(node.children) > 0:
      code += " " + gen_cpp(node.children[0], ctx, scope, tlevel)
  elif type(node) in [ExprListNode, ExprNode]:
    for i, c in enumerate(node.children):
      if i != 0: code += ", "
      code += gen_cpp(c)
  elif type(node) == BreakNode:
    code += t + "break"
  elif type(node) == ContinueNode:
    code += t + "continue"    
  else:
    print(type(node));
  return code

def gen_struct_init_function(fname, ctx):
  t = tab(1)
  
  code = "%s %s_struct_new("%(fname, fname)
  s = ctx.structs[fname]
  
  for i, c in enumerate(s.children):
    if i != 0: code += ", "
    code += gen_cpp(c, ctx, {}, 0);
  code += ")\n{\n"
  
  code += t + "%s ret;\n\n" % fname
  for k in s.members.keys():
    c = s.members[k]
    
    code += t + "ret.%s = %s;\n" % (k, k);
  
  code += t + "return ret;\n"
  code += "}"
  return code
  
def gen_cpp_code(node, ctx, tlevel=0):
  ctx.builtin_type_map["float16"] = "float16"
  
  #code = gen_struct_init_function("f32", ctx, {});
  code = gen_cpp(node, ctx, {}, tlevel)
  
  return code