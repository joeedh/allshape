
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
      }
    }
    
    static p_statement(p) {
      """5 statement : assign SEMI
      """
      
      if (p.length == 3) {
        p[0] = p[1];
      }
    }
    
    static p_assign(p) {
      """10 assign : ID EQUALS expr
      """
      //if (p.length == 4) {
        p[0] = new AssignNode(p[1], p[3], p[2])
      //}
    }
    
    static p_expr(p) {
      """20 expr : ID
                 | expr PLUS expr
                 | expr MINUS expr
                 | expr MULTIPLY expr
                 | expr DIVIDE expr
      """
      if (p.length == 2) {
        p[0] = p[1];
      } else if (p.length == 4) {
        p[0] = new BinOpNode(p[1], p[3], p[2]);
      }
    }
  }
  
  return Parser;
}