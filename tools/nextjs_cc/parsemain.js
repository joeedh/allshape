
function test_ast_super() {
  var n = new ASTNode();
  var n2 = new ASTNode();
  var n3 = new ASTNode();
  
  n.add(n2);
  n.add(n3);
  
  console.log(n.toString());
}

function find_linestr(t, last_t, col_off=0) {
  var s = ""
  var i = t.lexpos;
  var ld = t.lexer.lexdata;
  
  //first find column of token
  var col = 0, only_ws=true;
  while (i >= 0 && ld[i] != "\n") {
    if (i != t.lexpos && ld[i] != "\n" && ld[i] != "\r" && ld[i] != "\t" && ld[i] != " ")
      only_ws = false;
      
    i--;
    col++;
  }
  
  if (only_ws && last_t != undefined) {
    return find_linestr(last_t, undefined, 1);
  }
  
  col += col_off;
  
  if (ld[i] == "\n") {
    i--;
    col--;
  }
  
  //now find entire line string, backwards and forward of t.lexpos
  i = t.lexpos;
  while (i < ld.length && ld[i] != "\n") {
    s += ld[i];
    i++;
  }
  
  if (ld[i] == "\n") i--;
  
  while (i >= 0 && ld[i] != "\n") {
    s = ld[i] + s;
    i--;
  }
  
  if (ld[i] == "\n")
    i++;
  
  var cols = ""
  for (var i=0; i<=col; i++) {
    if (i == col) cols += "^";
    else cols += " ";
  }
  return [s, cols];
}
function print_err(t, lastt) {
  if (t == undefined) {
    console.log("\nError at end of input");
    return;
  }
  
  console.log("\nError at line " + t.lineno);
  var ret = find_linestr(t, lastt);
  var line = ret[0];
  var col = ret[1];
  
  console.log(line);
  console.log(col);
}

function get_argvs() {
 return process.argv.slice(2, process.argv.length);
}

var fs = require('fs');
function file_read(path) {
  var buf=new Buffer(256);
  var file=fs.openSync(path, "r");
  var s="";
  var read=0;
  do {
   read = fs.readSync(file, buf, 0, 256);
   s+=buf.slice(0, read).toString();
  } while (read!=0);
  
  fs.close(file);
  return s;
}

function nla_main() {
  var offs = [];
  var offtokens = [];
  var stack = [];
  
  var arguments = get_argvs();
  console.log(arguments);
  
  if (arguments.length < 1) {
    console.log("cc.js: no input files")
    return -1
  }
  
  var infile = arguments[0];
  var buf = file_read(infile)
  
  var ret = __parse(buf, stack, offs, offtokens);
  
  console.log("\n\n");
  if (ret == 0)  {
    console.log("success!");
  } else {
    //console.log("ERROR!", offtokens.length);
    if (offtokens.length > 0)
      print_err(offtokens[1], offtokens[0]);
  }
  
  if (stack.length == 0)
    stack.push(new StatementList());
  
  var result = stack[0];
  console.log(result.toString());
  
  var writer = new WriterVisit();
  writer.visit(result);
  
  console.log("result:")
  console.log(writer.buf);
  //console.log(stack[0][0].constructor.name);
  /*console.log("\n");
  console.log(".", AssignNode.prototype.prototype.toString == ASTNode.prototype.toString);
  console.log(";", BinOpNode.prototype.toString == ASTNode.prototype.toString);
  console.log(AssignNode.prototype.prototype.prototype.toString == ASTNode.prototype.toString);
  console.log(":", AssignNode.prototype.toString, AssignNode.prototype.toString == ASTNode.prototype.toString);
  */
}

nla_main();