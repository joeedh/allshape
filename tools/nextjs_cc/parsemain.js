
function test_ast_super() {
  var n = new ASTNode();
  var n2 = new ASTNode();
  var n3 = new ASTNode();
  
  n.add(n2);
  n.add(n3);
  
  console.log(n.toString());
}

function nla_main() {
  var offs = [];
  var offtokens = [];
  var stack = [];
  
  var ret = __parse("a = d * t + e;", stack, offs, offtokens);
  
  console.log("\n\n");
  if (ret == 0) 
    console.log("success!");
  else
    console.log("ERROR!");
    
  if (stack.length == 0)
    stack.push(new StatementList());
  
  var result = stack[0];
  console.log(result.toString());
  //console.log(stack[0][0].constructor.name);
  /*console.log("\n");
  console.log(".", AssignNode.prototype.prototype.toString == ASTNode.prototype.toString);
  console.log(";", BinOpNode.prototype.toString == ASTNode.prototype.toString);
  console.log(AssignNode.prototype.prototype.prototype.toString == ASTNode.prototype.toString);
  console.log(":", AssignNode.prototype.toString, AssignNode.prototype.toString == ASTNode.prototype.toString);
  */
}

nla_main();