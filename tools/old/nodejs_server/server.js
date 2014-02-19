#include "../server/server_macros.js"

var https = require('https');
var fs = require('fs');
var database = require('./database.js')
var utils = require('./utils.js')
var netapi = require('./network_api.js')
var db = require('./db_api.js')
//var fileapi = require('./fileapi.js')

var options = {
  key: fs.readFileSync('privateKey.key'),
  cert: fs.readFileSync('certificate.crt')
};

function handle_request(req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}

var ret;
var item = db.db.instance_item("users")

item.attrvals["username"] = "joeedh"
item.attrvals["password"] = ""
item.attrvals["email"] = "joeedh@gmail.com"

console.log(db.db.get("users", "username", "joeedh"));

//console.log(ret)
//https.createServer(options, handle_request).listen(8081);

