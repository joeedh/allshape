import os.path
from ply import yacc
from cs_lex import *
from cs_ast import *

"""
grammar format:

<$include file.ct>
<#
  
  c code
#>
<html code>
<#include "something.ccs">

<a href=<#=str "some_c_func()">>

so it's a templating system.

"""

def p_statementlist(p):
  ''' statementlist : statement 
                  | statementlist statement
                  |
  '''
  
  if len(p) == 1:
    p[0] = StatementList()
  elif len(p) == 2:
    p[0] = StatementList()
    p[0].add(p[1])
  elif len(p) == 3:
    p[0] = p[1]
    p[0].add(p[2])
  
def p_statement(p):
  ''' statement : code
                | html
                | binding
                | include
  '''
  p[0] = p[1]

def p_code(p):
  ''' code : CODE
  '''
  p[0] = CodeNode(p[1])

def p_include(p):
  '''include : INCLUDE
  '''
  p[0] = IncludeNode(p[1])
  
def p_binding(p):
  ''' binding : BINDING
  '''
  
  start = p[1].find("|")
  type = p[1][:start]
  val = p[1][start+1:]
  
  p[0] = BindingNode(val.strip(), type)


def p_html(p):
  ''' html : HTML
  '''
  p[0] = HtmlNode(p[1])
 
class JSCCError (RuntimeError):
  pass

def get_lineno(p):
  line = p.lineno
  if type(p.lineno) != int:
    line = line(0)
  return line

def get_linestr(p):
  if p == None: return "(EOF)"
  
  i = p.lexpos
  ld = p.lexer.lexdata
  col = 0
  
  while i >= 0 and ld[i] != "\n":
    i -= 1
    col += 1
  
  if ld[i] == "\n":
    i += 1
    col -= 1
  
  start = i
  linestr = ""
  colstr = ""
  
  i = p.lexpos
  while i < len(ld) and ld[i] != "\n":
    i += 1
  
  end = i
  for i in range(col):
    colstr += " "
  colstr += "^"
  
  linestr = ld[start:end]
  return linestr, colstr
  
def p_error(p):
  line = get_lineno(p)+1
  
  if not glob.g_msvc_errors:
    errstr = "\n%s(%i): Syntax Error" % (glob.g_file, line)
    sys.stderr.write(errstr+"\n");
    
    linestr, colstr = get_linestr(p)
    sys.stderr.write("  %s\n  %s" % (linestr, colstr))
  else:
    linestr, colstr = get_linestr(p)
    errstr = "%s(%s,%s): error: Syntax Error\n" % (os.path.abspath(glob.g_file), line, len(colstr))
    sys.stderr.write(errstr)
    
  raise JSCCError("Parse error")
  
parser = yacc.yacc()

if __name__ == "__main__":
  tst = """
    <!DOCTYPE html>
    <html>
    <head><title><#=PAGE_TITLE#></title>
    </head>
    <body>
    <#
      int i;
      char arr[32];
      
      for (i=0; i<32; i++) {
      #>
        <p><#=i></p><br/>
      <#
      }
    #>
  """
  from cs_process import *
  
  ret = parser.parse(tst)
  compact_strnodes(ret, StrNode)
  compact_strnodes(ret, HtmlNode)
  
  print(ret)
  