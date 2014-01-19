# Yacc example
import os, sys, os.path, time, random, math, io, struct, imp
import ply.yacc as yacc

# Get the token map from the lexer.  This is required.
from tinygpu_ast import *
from tinygpu_lex import tokens
import tinygpu_lex

glob = tinygpu_lex.glob

precedence = (
  ("left", "QEST", "COLON"),
  ("left", "BNEGATE"),
  ("left", "BAND", "BOR", "BXOR"),
  ("left", "LAND", "LOR"),
  ('nonassoc', 'LTHAN', 'GTHAN', 'EQUAL', 'NOTEQUAL', "GTHANEQ", "LTHANEQ", "NOTEQUAL"),
  ("left", "PLUS", "MINUS"),
  ("left", "TIMES", "DIVIDE"),
  ("left", "MOD"),
  ("right", "UMINUS"), #negation prefix operation, note this is a "fictitious" token
  ("right", "NOT"),
  ("left", "LPAREN"),
  ("left", "LSBRACKET"),
  ("left", "DEC", "INC"),
  ("left", "DOT"),
  #("left", "", ""),
)

def p_statementlist(p):
  ''' statementlist : statement
                    | statement_local
                    | statementlist statement
                    | statementlist statement_local 
  '''

  glob.g_line = p.lexer.lineno
  if len(p) == 1:
    p[0] = StatementList()
  elif len(p) == 2:
    p[0] = StatementList()
    if p[1] != None:
      p[0].add(p[1])
  else:
    if type(p[1]) != StatementList:
      p[0] = StatementList()
      p[0].add(p[1])
    else:
      p[0] = p[1]
      if p[2] != None:
        p[1].add(p[2])

def p_statement(p):
  ''' statement : if
                | function
                | builtin_func SEMI
                | builtin_global SEMI
                | else
                | for
                | expr SEMI
                | return SEMI
                | break SEMI
                | continue SEMI
                | struct SEMI
                | assign SEMI
                | var_decl SEMI
                | SEMI
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 2:
    if p[1] == None:
      p[0] = NullStatement()
    else:
      p[0] = p[1]
  else:
    p[0] = p[1];

def p_statement_local(p):
  ''' statement_local : assign SEMI
                        | if
                        | else
                        | for
                        | return SEMI
                        | break SEMI
                        | continue SEMI
                        | var_decl SEMI
                        | struct SEMI
                        | SEMI
  '''
  
  glob.g_line = p.lexer.lineno

  if p[1] == None or p[1] == ';':
    p[0] = NullStatement()
  else:
    p[0] = p[1]

def p_modifier(p):
  '''modifier : UNIFORM
              | ATTRIBUTE
              | VARYING
              | INPUT
              | OUTPUT
              | HIGHP
              | MEDIUMP
              | LOWP
  '''
  glob.g_line = p.lexer.lineno
  p[0] = p[1]
    
def p_type_decl(p):
  '''type_decl : INT
               | FLOAT
               | BOOL
               | FLOAT16
               | DOUBLE
               | VOID
               | ID
               | modifier type_decl
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 2:
    if p[1] in ["int", "bool", "sampler2D", "float", "float16", \
                "double", "vec2", "vec3", "vec4", "mat4", "void", "string"]:
      if p[1] == "vec2":
        p[0] = ArrTypeNode(2)
        p[0].type = BuiltinTypeNode("float16")
        p[0].builtin_name = "vec2"
      elif p[1] == "vec3":
        p[0] = ArrTypeNode(3)
        p[0].type =BuiltinTypeNode("float16")
        p[0].builtin_name = "vec3"
      elif p[1] == "vec4":
        p[0] = ArrTypeNode(4)
        p[0].type = BuiltinTypeNode("float16")
        p[0].builtin_name = "vec4"
      elif p[1] == "mat4":
        p[0] = ArrTypeNode(4)
        p[0].add(ArrTypeNode(4))
        p[0].type = p[0].children[0] #BuiltinTypeNode("float16")
        p[0].children[0].type = BuiltinTypeNode("float16")
        p[0].builtin_name = "mat4"
      elif p[1] == "sampler2D":
        p[0] = BuiltinTypeNode(p[1]);
      elif p[1] == "string":
        p[0] = StrLitNode("")
      else:
        p[0] = BuiltinTypeNode(p[1])
    else:
      p[0] = TypeRefNode(p[1])
  else:
    p[0] = p[2]
    p[0].modifiers.add(p[1])
    
def p_arr_decl(p):
  ''' arr_decl : LSBRACKET NUMBER RSBRACKET
      arr_decl : LSBRACKET RSBRACKET
      arr_decl : arr_decl LSBRACKET NUMBER RSBRACKET
      arr_decl : arr_decl LSBRACKET RSBRACKET
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    if type(p[1]) == ArrTypeNode:
      p[0] = ArrTypeNode(p[3])
      p[0].add(p[1])
    else:
      p[0] = ArrTypeNode(p[2])
  elif len(p) == 3:
    p[0] = ArrTypeNode(0)
  else:
    p[0] = ArrTypeNode(p[3])
    p[0].add(p[1])
  

def p_var_basic(p):
  '''var_basic : type_decl ID arr_decl
              | type_decl ID
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 3:
    p[0] = VarDeclNode(p[1], p[2])
  else:
    arr = p[3]
    arr.type = p[1]
    p[1].parent = arr
    
    arr.modifiers = p[1].modifiers
    
    p[0] = VarDeclNode(arr, p[2])

def p_var_decl(p):
    '''var_decl : var_basic
                | var_basic ASSIGN expr
    '''
    
    glob.g_line = p.lexer.lineno
    p[0] = p[1]
    if len(p) == 4:
      p[0].add(p[3])
     
def p_cmplx_assign(p):
  '''cmplx_assign : ASSIGNPLUS 
                  | ASSIGNMINUS 
                  | ASSIGNDIVIDE 
                  | ASSIGNTIMES 
                  | ASSIGNBOR 
                  | ASSIGNBAND 
                  | ASSIGNBXOR 
                  | ASSIGN
  '''

  p[0] = p[1]

def p_assign_expr(p):
  '''assign_expr : ID
                 | assign_expr DOT assign_expr
                 | assign_expr LSBRACKET expr RSBRACKET
                 | assign_expr INC
                 | assign_expr DEC
                 | INC assign_expr
                 | DEC assign_expr
  '''

  if len(p) == 2:
    p[0] = IdentNode(p[1])
  elif len(p) == 4:
    p[0] = BinOpNode(p[1], p[3], ".")
  elif len(p) == 5:
    p[0] = ArrayRefNode(p[1], p[3])
  
def p_assign(p):
  ''' assign : assign_expr cmplx_assign expr 
             | assign cmplx_assign expr
             | INC assign_expr
             | DEC assign_expr
             | assign_expr INC
             | assign_expr DEC
  '''
  
  glob.g_line = p.lexer.lineno
  
  if len(p) == 3:
    if p[1] == "++":
      p[0] = PreInc(p[2])
    elif p[1] == "--":
      p[0] = PreDec(p[2])
    elif p[2] == "++":
      p[0] = PostInc(p[1])
    elif p[2] == "--":
      p[0] = PostDec(p[1])
  else:
    p[0] = AssignNode(p[1], p[3], mode=p[2])
  
def p_exprlist(p):
  r'''
    exprlist : expr
             | ID ASSIGN expr
             | exprlist COMMA expr
             | exprlist COMMA ID ASSIGN expr
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 2:
    p[0] = ExprListNode([p[1]])
  elif len(p) == 4:
    if type(p[1]) == ExprListNode:
      p[0] = p[1]
      p[1].add(p[3])
    else:
      p[0] = ExprListNode([AssignNode(p[1], p[3])])
  elif len(p) == 6:
    p[0] = p[1]
    p[0].add(AssignNode(p[3], p[5]))


def p_func_call(p):
  r''' func_call : LPAREN exprlist RPAREN
                 | LPAREN RPAREN
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 3:
    elist = ExprNode([])
  else:
    elist = p[2]
    
  p[0] = FuncCallNode(elist);

#this is nearly identical to exprlist; it is identical on the action side
def p_funcdeflist(p):
  r'''
    funcdeflist : type_decl ID
                | type_decl ID arr_decl
                | funcdeflist COMMA type_decl ID arr_decl
                | funcdeflist COMMA type_decl ID
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 3:
    p[0] = FuncArgsNode(IdentNode(p[2]))
    p[0].add(p[1])
  elif len(p) == 4:
    p[3].type = IdentNode(p[2])
    p[3].type.parent = p[3]
    
    p[0] = FuncArgsNode(p[3])
    p[0].add(p[1])
  else:
    n = FuncArgsNode(IdentNode(p[4]))
    n.add(p[3])
   
    p[0] = p[1]
    p[0].add(n)

def p_structlist(p):
  ''' structlist : var_basic SEMI
                 | struct
                 | structlist var_basic SEMI  
                 | structlist struct
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 3 and type(p[1]) != list:
    p[0] = [p[1]]
  elif len(p) == 2:
    p[0] = [p[1]]
  else:
    p[0] = p[1]
    p[0].append(p[2])
    
def p_struct(p):
  ''' struct : STRUCT ID LBRACKET structlist RBRACKET
             | STRUCT LBRACKET structlist RBRACKET ID
  '''
  
  glob.g_line = p.lexer.lineno
  if p[2] == "{":
    p[0] = StructTypeNode(p[5])

    for c in p[3]:
      p[0].add(c)
  else:
    p[0] = StructTypeNode(p[2])
    
    for c in p[4]:
      p[0].add(c)
      
def p_function(p):
  ''' function : type_decl ID LPAREN funcdeflist RPAREN LBRACKET statementlist RBRACKET
               | type_decl ID LPAREN RPAREN LBRACKET statementlist RBRACKET
               | type_decl ID LPAREN funcdeflist RPAREN COLON ID LBRACKET statementlist RBRACKET
               | type_decl ID LPAREN RPAREN COLON ID LBRACKET statementlist RBRACKET
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 9:
    p[0] = FunctionNode(p[2], p.lineno)
    p[0].add(p[1])
    p[0].add(p[4])
    
    for c in p[7].children:
      p[0].add(c)
  elif len(p) == 11:
    p[0] = FunctionNode(p[2], p.lineno)
    p[0].add(p[1])
    p[0].add(p[4])
    
    for c in p[9].children:
      p[0].add(c)
    
    p[0].output_name = p[7]
  elif len(p) == 10:
    p[0] = FunctionNode(p[2], p.lineno)
    p[0].add(p[1])
    p[0].add(ExprNode([]))
    
    for c in p[8].children:
      p[0].add(c)
    p[0].output_name = p[6]
  else:
    p[0] = FunctionNode(p[2], p.lineno)
    p[0].add(p[1])
    p[0].add(ExprNode([]))
    
    for c in p[6].children:
      p[0].add(c)

def p_builtin_id(p):
  '''
    builtin_id : ID
               | FLOAT
               | INT
               | BOOL
  '''
  p[0] = p[1]
  
def p_builtin_function(p):
  '''
      builtin_func : BUILTIN type_decl ID ASSIGN builtin_id LPAREN funcdeflist RPAREN
                   | BUILTIN type_decl ID ASSIGN builtin_id LPAREN RPAREN
  '''
  glob.g_line = p.lexer.lineno
 
  if len(p) == 9:
    p[0] = FunctionNode(p[3], p.lineno)
    p[0].add(p[2])
    p[0].add(p[7])
  else:
    p[0] = FunctionNode(p[3], p.lineno)
    p[0].add(p[2])
    p[0].add(ExprNode([]))
  
  p[0].glsl_builtin = True
  p[0].glsl_name = p[5]
  p[0].ret_type = p[2]

def p_builtin_global(p):
  '''
      builtin_global : BUILTIN type_decl ID arr_decl
                     | BUILTIN type_decl ID
  '''
  glob.g_line = p.lexer.lineno
 
  p[0] = BuiltinVarDeclNode(p[2], p[3])
  
  if len(p) == 5:
      p[4].type = p[2]
      p[0].type = p[4]
  
def p_array_literal(p):
  '''array_literal : LSBRACKET exprlist RSBRACKET
                   | LSBRACKET RSBRACKET
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    p[0] = ArrayLitNode(p[2])
  else:
    p[0] = ArrayLitNode(ExprListNode([]))

def p_obj_lit_list(p):
  r'''
    obj_lit_list : ID COLON expr
             | obj_lit_list COMMA ID COLON expr
  '''
  
  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    p[0] = ObjLitNode()
    p[0].add(AssignNode(p[1], p[3]))
  elif len(p) == 6:
    p[0] = p[1]
    p[0].add(AssignNode(p[3], p[5]))

def p_obj_literal(p):
  '''obj_literal : LBRACKET obj_lit_list RBRACKET
                    | LBRACKET RBRACKET
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    p[0] = p[2]
  else:
    p[0] = ObjLitNode()

def p_new(p):
  '''new : NEW expr
  '''
  glob.g_line = p.lexer.lineno
  p[0] = KeywordNew(p[2])

def p_inc(p):
  '''inc : expr INC
         | INC expr
  '''
  glob.g_line = p.lexer.lineno
  if p[1] == "++":
    p[0] = PreInc(p[2]);
  else:
    p[0] = PostInc(p[1])
    
def p_dec(p):
  '''dec : expr DEC
         | DEC expr
  '''

  glob.g_line = p.lexer.lineno
  if p[1] == "--":
    p[0] = PreDec(p[2]);
  else:
    p[0] = PostDec(p[1])

def p_not(p):
  '''not : NOT expr'''
  glob.g_line = p.lexer.lineno
  p[0] = LogicalNotNode(p[2])

def p_strlit(p):
    '''strlit : STRINGLIT'''
    glob.g_line = p.lexer.lineno
    p[0] = StrLitNode(p[1])
    
def p_expr(p):
    '''expr : NUMBER
            | TRUE
            | FALSE
            | strlit
            | ID
            | array_literal
            | obj_literal
            | expr DOT expr
            | expr LAND expr
            | expr LOR expr
            | expr BOR expr
            | expr BXOR expr
            | expr BAND expr
            | expr EQUAL expr
            | expr NOTEQUAL expr
            | expr GTHAN expr
            | expr GTHANEQ expr
            | expr LTHAN expr
            | expr MOD expr
            | expr LTHANEQ expr
            | expr PLUS expr
            | expr MINUS expr
            | expr DIVIDE expr
            | expr TIMES expr
            | LPAREN expr RPAREN
            | expr func_call
            | expr LSBRACKET expr RSBRACKET
            | expr QEST expr COLON expr
            | expr_uminus
            | assign2
            | not
            | new
            | inc
            | dec
            '''
    
    glob.g_line = p.lexer.lineno
    if len(p) == 6: #trinary conditional expressions
      p[0] = TrinaryCondNode(p[1], p[3], p[5]);
    if len(p) == 5: #array lookups
      p[0] = ArrayRefNode(p[1], p[3])
    elif len(p) == 4:
      if p[1] == '(' and p[3] == ')':
        p[0] = p[2]
      else:
        p[0] = BinOpNode(p[1], p[3], p[2])
    elif len(p) == 3:
      if p[2] == "++":
        p[0] = PostInc(p[1])
      elif type(p[2]) == FuncCallNode:
        p[0] = p[2];
        p[0].prepend(p[1]);
    elif len(p) == 2:
      if type(p[1]) in [AssignNode, StrLitNode, LogicalNotNode, NegateNode, ArrayLitNode, ObjLitNode, FunctionNode, KeywordNew, PreInc, PostInc, PreDec, PostDec]:
        p[0] = p[1]
      elif type(p[1]) in [int, float]:
        p[0] = NumLitNode(p[1])
      elif p[1] in ["true", "false"]:
        p[0] = BoolLitNode(p[1])
      elif p[1].startswith('"'):
        p[0] = StrLitNode(p[1])
      else:
        p[0] = IdentNode(p[1])

def p_assign_expr2(p):
  '''assign_expr2 : ID
                 | assign_expr2 DOT assign_expr2
                 | assign_expr2 LSBRACKET expr RSBRACKET
  '''

  if len(p) == 2:
    p[0] = IdentNode(p[1])
  elif len(p) == 4:
    p[0] = BinOpNode(p[1], p[3], ".")
  elif len(p) == 5:
    p[0] = ArrayRefNode(p[1], p[3])
    
def p_assign2(p):
  ''' assign2 : assign_expr2 cmplx_assign expr 
             | assign2 cmplx_assign expr
             | INC assign_expr2
             | DEC assign_expr2
             | assign_expr2 INC
             | assign_expr2 DEC
  '''
  
  glob.g_line = p.lexer.lineno
  
  if len(p) == 3:
    if p[1] == "++":
      p[0] = PreInc(p[2])
    elif p[1] == "--":
      p[0] = PreDec(p[2])
    elif p[2] == "++":
      p[0] = PostInc(p[1])
    elif p[2] == "--":
      p[0] = PostDec(p[1])
  else:
    p[0] = AssignNode(p[1], p[3], mode=p[2])
  
def p_expr_uminus(p):
    '''expr_uminus : MINUS expr %prec UMINUS
    '''
    glob.g_line = p.lexer.lineno
    p[0] = NegateNode(p[2]);
    

def p_paren_expr(p):
  '''paren_expr : LPAREN expr RPAREN
                | LPAREN RPAREN
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    p[0] = p[2]
  else:
    p[0] = ExprNode([])
  
def p_for_decl(p):
  '''
    for_decl : var_decl SEMI expr SEMI assign
  '''
  glob.g_line = p.lexer.lineno
  p[0] = ForCNode(p[1], p[3], p[5])
  
def p_for(p):
  '''for : FOR LPAREN for_decl RPAREN statement_local
         | FOR LPAREN for_decl RPAREN LBRACKET statementlist RBRACKET
  '''

  glob.g_line = p.lexer.lineno
  if len(p) == 6:
    p[0] = ForLoopNode(p[3])
    p[0].add(p[5])
  else:
    p[0] = ForLoopNode(p[3])
    p[0].add(p[6])

def p_if(p):
  '''if : IF paren_expr statement_local
        | IF paren_expr LBRACKET statementlist RBRACKET
  '''

  glob.g_line = p.lexer.lineno
  if len(p) == 4:
    p[0] = IfNode(p[2])
    p[0].add(p[3])
  else:
    p[0] = IfNode(p[2])
    p[0].add(p[4])

def p_else(p):
  '''else : ELSE statement_local
          | ELSE LBRACKET statementlist RBRACKET
  '''
  glob.g_line = p.lexer.lineno
  if len(p) == 5:
    p[0] = ElseNode()
    p[0].add(p[3])
  else:
    p[0] = ElseNode()
    p[0].add(p[2])

def p_break(p):
  '''break : BREAK 
  '''
            
  glob.g_line = p.lexer.lineno
  p[0] = BreakNode()

def p_continue(p):
  '''continue : CONTINUE 
  '''
            
  glob.g_line = p.lexer.lineno
  p[0] = ContinueNode()

def p_return(p):
  '''return : RETURN expr
            | RETURN'''
            
  glob.g_line = p.lexer.lineno
  if len(p) == 3 and p[2] != ";":
    p[0] = ReturnNode(p[2])
  else:
    p[0] = ReturnNode(ExprNode([]))
  
    
# Error rule for syntax errors
def err_find_line(p):
  if p == None: 
    return "", ""
  else: 
    lexer = p.lexer
    lpos = p.lexpos
    
  try:
    i = lpos
    while i >= 0 and lexer.lexer.lexdata[i] != "\n":
      i -= 1
    
    """
    i2 = i-1
    while i2 >= 0 and lexer.lexdata[i2] != "\n":
      i2 -= 1
    
    i2 = i2-1
    while i2 >= 0 and lexer.lexdata[i2] != "\n":
      i2 -= 1
    """
    
    j = lpos
    
    while j < len(lexer.lexer.lexdata) and lexer.lexer.lexdata[j] != "\n":
      j += 1
    
    col = lpos-i-1;
    colstr = ""
    for k in range(col):
      colstr += " "
    colstr += "^"
    
    return lexer.lexer.lexdata[i+1:j], colstr
  except TypeError:
    return "Couldn't find error line", ""
    
def print_err(p):
  glob.g_error = True
  
  if p == None:
    msg = "unexpected EOF in input"
    
    file = open(g_files[0], "r")
    line = len(file.read().split("\n"))
    file.close()
  else:
    try:
      line = p.lineno+1
    except:
      line = p.lineno(1)
    
  if glob.g_print_msvc_errors:
    files = glob.files
    linestr, colstr = err_find_line(p)
    sys.stderr.write("%s(%d,%d): error: %s\r\n"%(files[0], line, len(colstr)-1,"Syntax error"))
    sys.stderr.write("%s\n%s\n"%(linestr, colstr))
  else:
    linestr, colstr = err_find_line(p)
    sys.stderr.write("Syntax error in input! line: %d\n%s\n%s\n"%(line, linestr, colstr))
    
def p_error(p):
  """
  print(p.lexer.prev.lineno, p.lineno)
  if p.lexer.prev.lineno < p.lineno or p.type == "RBRACKET":
    yacc.errok()
    return
  """
  if p == None:
    print("Hit EOF")
    return
  """
  try:
    line = int(p.lineno)
  except:
    line = p.lineno(0)
  
  try:
    lexdata = p.lexer.lexer.lexdata
    sline = p.lexer.lexer.lexpos
  except:
    lexdata = p.lexer.lexdata
    sline = p.lexer.lexpos
  
  #sline = lexdata[sline-40:sline+1]
  #print("Error at line " + str(line) + "\n" + str(sline))
  """
  print_err(p)
  
# Build the parser
parser = yacc.yacc()

