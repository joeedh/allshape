function get_argvs() {
  return process.argv.slice(2, process.argv.length);
}
function cwd() {
  return process.cwd();
  
}

console.log("\n");

lexer = thelexer();
parser = theparser();

nparser = NlyCC(lexer, parser);
arguments = get_argvs()
