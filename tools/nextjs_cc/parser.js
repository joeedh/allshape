
function theparser() {
  class Parser extends NlyParser {
    static p_statementlist(p) {
      """0 statementlist : statement
                         | statementlist statement
                         |
      """
      
      if (p.length == 2) {
        p[0] = new StatementList()
        if (p[1] != undefined)
          p[0].add(p[1]);
      } else if (p.length == 3) { 
        p[0] = p[1];
        p[0].add(p[2]);
      } else {
        p[0] = new StatementList();
      }
    }
    
    static p_statement(p) {
      """5 statement : simple_assign SEMI
                     | func
                     | expr SEMI
                     | return SEMI
      """
      
      p[0] = p[1];
    }
    
    static p_func(p) {
      """6 func : FUNCTION ID LPAREN funcdeflist RPAREN LBRACKET statementlist RBRACKET
      """
      
      p[0] = new FunctionNode(p[2]);
      p[0].add(p[4]);
      p[0].add(p[7]);
    }
    
    static p_funcdeflist(p) {
      """7 funcdeflist : id 
                     | simple_assign
                     | funcdeflist COMMA id
                     | funcdeflist COMMA simple_assign
                     |
      """
      if (p.length == 1) {
        p[0] = new ExprListNode();
      } else if (p.length == 2) {
        p[0] = new ExprListNode()
        p[0].add(p[1]);
      } else if (p.length == 4) {
        p[0] = p[1];
        p[0].add(p[3]);
      }
    }
    
    static p_return(p) {
      """8 return : RETURN expr
                  | RETURN
      """
      if (p.length == 3) {
        p[0] = new ReturnNode(p[2]);
      } else {
        p[0] = new ReturnNode(new IdentNode("undefined"));
      }
    }
    
    static p_assign(p) {
      """9 assign : expr ASSIGN expr
      """
      
      p[0] = new AssignNode(p[1], p[3], p[2]);
    }
    
    static p_simple_assign(p) {
      """10 simple_assign : ID ASSIGN expr
                          | VAR simple_assign
      """
      //if (p.length == 4) {
      if (p.length == 4) {
        p[0] = new AssignNode(p[1], p[3], p[2])
      } else if (p.length == 3) {
        p[0] = p[2];
        p[0] = new VarDeclNode(p[0].val, p[0][1], true);
      }
    }
    
    static p_id(p) {
      """15 id : ID
      """
      
      p[0] = new IdentNode(p[1]);
    }
    
    static p_number(p) {
      """16 number : NUMBER
      """
      
      p[0] = new NumLitNode(p[1]);
    }
    
    static p_objlit(p) {
      """21 objlit : LBRACKET objlit_list RBRACKET
      """
      
      p[0] = p[2];
    }
    
    static p_id_or_str(p) {
      """18 id_or_str : ID
                      | STRINGLIT
      """
      p[0] = p[1];
    }
    
    static p_arrlit(p) {
      """19 arrlit : LSBRACKET arrlit_list RSBRACKET
      """
      p[0] = p[2];
    }
    
    static p_arrlit_list(p) {
      """20 arrlit_list : expr
                        | arrlit_list COMMA expr
                        |
      """
      if (p.length == 1) {
        p[0] = new ArrLitNode();
      } else if (p.length == 2) {
        p[0] = new ArrLitNode();
        p[0].add(p[1]);
      } else if (p.length == 4) {
        p[0] = p[1];
        p[0].add(p[3]);
      }
    }
    
    static p_objlit_list(p) {
      """22 objlit_list : id_or_str COLON expr
                        | objlit_list COMMA id_or_str COLON expr
                        |
      """
      
      if (p.length == 4) {
        p[0] = new ObjLitNode();
        p[0].add(new AssignNode(p[1], p[3], "="));
      } else if (p.length == 6) {
        p[0] = p[1];
        p[0].add(new AssignNode(p[3], p[5], "="));
      } else {
        p[0] = new ObjLitNode();
      }
    }
    
    static p_expr(p) {
      """23 expr : id
                 | number
                 | expr ASSIGN expr
                 | expr PLUS expr
                 | expr MINUS expr
                 | expr TIMES expr
                 | expr DIVIDE expr
                 | expr DOT expr
                 | LPAREN expr RPAREN
                 | objlit
                 | arrlit
      """
      
      if (p.length == 2) {
        p[0] = p[1];
      } else if (p.length == 4) {
        if (p[1] == "(") {
          p[0] = new ExprNode(p[2], true);
        } else if (p[2] == "=") {
          p[0] = new AssignNode(p[1], p[3], p[2]);
        } else {
          p[0] = new BinOpNode(p[1], p[3], p[2]);
        }
      }
    }
  }
  
  return Parser;
}