SERVER_VERSION = 0.01;
if (String.startsWith==undefined) {
  String.prototype.startsWith = function(str) {
   if (str.length>this.length)
    return false;
   for (var i=0; i<str.length; i++) {
     if (this[i]!=str[i])
      return false;
   }
   return true;
  }
}
if (String.contains==undefined) {
  String.prototype.contains = function(str) {
   if (str.length>this.length)
    return false;
   for (var i=0; i<this.length-str.length+1; i++) {
     var found=true;
     for (var j=0; j<str.length; j++) {
       if (this[i+j]!=str[j]) {
         found = false;
         break;
       }
     }
     if (found)
      return true;
   }
   return false;
  }
}
String.prototype.find = function(str) {
 if (str.length>this.length)
  return false;
 for (var i=0; i<this.length-str.length+1; i++) {
   var found=true;
   for (var j=0; j<str.length; j++) {
     if (this[i+j]!=str[j]) {
       found = false;
       break;
     }
   }
   if (found)
    return i;
 }
 return -1;
}
function is_str(str) {
 return typeof str=="string"||typeof str=="String";
}
function get_type_name(obj) {
 if (obj==undefined)
  return "undefined";
 var c;
 try {
  var c=obj.toSource();
 }
 catch (Error) {
   c = "";
 }
 if (obj.toString().startsWith("[object ")) {
   var c2=obj.toString().replace("[object ", "").replace("]", "");
   if (c2!="Object"&&c2!="Array") {
     return c2;
   }
 }
 if (c.contains(">")&&c.contains("<")&&!c.contains(" ")&&!c.contains(",")&&!c.contains(".")) {
   c = c.replace(">", "").replace("<", "");
   if (c!="Object"&&c!="Array") {
     return c;
   }
 }
 if (obj.constructor.name!=undefined&&obj.constructor.name!="")
  return obj.constructor.name;
 if (obj.constructor==MouseEvent)
  return "MouseEvent";
 if (obj.constructor==KeyEvent)
  return "KeyEvent";
 if (obj.constructor==KeyboardEvent)
  return "KeyboardEvent";
 return "(unknown)";
}
log_cache = {}
slog_queue = [];
flush_queue = false;
last_queue_time = 0;
function server_log(msg) {
 if (msg!=undefined) {
   if (log_cache.hasOwnProperty(msg))
    return ;
   log_cache[msg] = msg;
   slog_queue.push(msg);
 }
 console.log(window.performance.now()-last_queue_time);
 if ((slog_queue.length>0&&window.performance.now()-last_queue_time>1500)||flush_queue) {
   flush_queue = false;
   console.log("flushing...");
   var req=new XMLHttpRequest();
   req.open("POST", "/logger", true);
   req.setRequestHeader("Content-type", "text/text");
   req.onreadystatechange = function() {
    if (req.readyState==4&&req.status==200) {
      var resp=req.responseText;
      console.log("read response", resp);
    }
   }
   buf = "";
   for (var i=0; i<slog_queue.length; i++) {
     buf+=slog_queue[i]+"\n";
   }
   req.send(buf);
   slog_queue = [];
   last_queue_time = window.performance.now();
 }
}
function flush_server_log() {
 flush_queue = true;
 server_log();
}
function arr_iter(keys) {
 this.keys = keys;
 this.cur = 0;
 this.__iterator__ = function() {
  return this;
 }
 this.next = function() {
  if (this.cur>=this.keys.length) {
    throw StopIteration;
  }
  return this.keys[this.cur++];
 }
}
try {
 var i=StopIteration;
}
catch (error) {
  StopIteration = {"SI": 1}
}
__use_Iterator = false;
_do_frame_debug = false;
_do_iter_err_stacktrace = true;
FrameContinue = {"FC": 1}
FrameBreak = {"FB": 1}
function getattr(obj, attr) {
 return obj[attr];
}
function setattr(obj, attr, val) {
 obj[attr] = val;
}
function delattr(obj, attr) {
 delete obj[attr];
}
function __get_iter(obj) {
 if (obj==undefined) {
   console.trace();
   print_stack();
   throw "Invalid iteration over undefined value";
 }
 if (obj.__proto__.hasOwnProperty("__iterator__")||obj.hasOwnProperty("__iterator__")) {
   return obj.__iterator__();
 }
 else {
  if (__use_Iterator) {
    return Iterator(obj);
  }
  else {
   keys = [];
   for (var k in obj) {
     keys.push(k);
   }
   return new arr_iter(keys);
  }
 }
}
function __get_iter2(obj) {
 if (obj.__proto__.hasOwnProperty("__iterator__")||obj.hasOwnProperty("__iterator__")) {
   return obj.__iterator__();
 }
 else {
  var keys=[];
  for (var k in obj) {
    keys.push([k, obj[k]]);
  }
  return new arr_iter(keys);
 }
}
try {
 _tst = Iterator({});
}
catch (Error) {
  __use_Iterator = false;
  Iterator = __get_iter2;
}
utils = require("../../server/js_build/utils.js");
inherit = utils.inherit;
create_prototype = utils.create_prototype;
set = utils.set;
GArray = utils.GArray;
hashtable = utils.hashtable;
print_stack = utils.print_stack;
var https=require('https');
var fs=require('fs');
var database=require('./database.js');
var utils=require('./utils.js');
var netapi=require('./network_api.js');
var db=require('./db_api.js');
var options={key: fs.readFileSync('privateKey.key'), cert: fs.readFileSync('certificate.crt')}
function handle_request(req, res) {
 res.writeHead(200);
 res.end("hello world\n");
}
var ret;
var item=db.db.instance_item("users");
item.attrvals["username"] = "joeedh";
item.attrvals["password"] = "";
item.attrvals["email"] = "joeedh@gmail.com";
console.log(db.db.get("users", "username", "joeedh"));

//# sourceMappingURL=/content/../server/js_build/server.js.sm
