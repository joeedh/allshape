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
    return;
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
var events=require("events");
DBTypes = {}
DBFieldTypes = DBT = {STRING: "S", NUMBER_KEY: "NK", NUMBER: "N", BINARY: "B", NUMBERSET: "NS", BINARYSET: "BS"}
js_type_DBFieldTypes = {"S": String, "N": Number, "B": ArrayBuffer, "NS": set, "BS": set}
function DBError(msg) {
 Error.call(this);
 this.message = msg;
}
inherit(DBError, Error);
exports.DBError = DBError;
DBError.toString = function() {
 return this.constructor.name+": d"+this.msg;
}
DBError.valueOf = function() {
 return this.toString();
}
function DBConditionalCheckFailedException(msg) {
 DBError.call(msg);
}
inherit(DBConditionalCheckFailedException, DBError);
exports.DBConditionalCheckFailedException = DBConditionalCheckFailedException;
function DBValidationException(msg) {
 DBError.call(msg);
}
inherit(DBValidationException, DBError);
exports.DBValidationException = DBValidationException;
D_INVALID = undefined;
D_EQ = 1;
D_LE = 2;
D_LT = 3;
D_GE = 4;
D_GT = 5;
D_BEGINS_WITH = 6;
D_BETWEEN = 7;
D_NOT_CONTAINS = 8;
D_IN = 9;
DOP = {"==": D_EQ, "<": D_LT, "<=": D_LE, ">=": D_GE, ">": D_GT, "BEGINS_WITH": D_BEGINS_WITH, "BETWEEN": D_BETWEEN, "NOT_CONTAINS": D_NOT_CONTAINS, "IN": D_IN}
function DBCmp(type, attrs) {
 this.type = type;
 this.attrs = attrs;
 if (attrs instanceof String) {
   attrs = [attrs];
 }
}
exports.DBCmp = DBCmp;
function DBItem(attrs, vals) {
 this.attrs = attrs;
 this.attrvals = {}
 if (vals==undefined) {
   vals = {}
 }
 var __iter_k = __get_iter(vals);
 while (1) {
  try {
   var k = __iter_k.next();
   if (!(k in attrs)) {
     throw new DBError("Attr value not in attr type map");
   }
   this.attrvals[k] = vals[k];
  }
  catch (_for_err) {
    if (_for_err!==StopIteration) {
      if (_do_iter_err_stacktrace)
       print_stack(_for_err);
      throw _for_err;
      break;
    }
    break;
  }
 }
}
inherit(DBItem, utils.hashtable);
exports.DBItem = DBItem;
DBItem.prototype.copy = function() {
 var item2=new DBItem({});
 var __iter_k = __get_iter(this.attrs);
 while (1) {
  try {
   var k = __iter_k.next();
   item2.attrs[k] = this.attrs[k];
  }
  catch (_for_err) {
    if (_for_err!==StopIteration) {
      if (_do_iter_err_stacktrace)
       print_stack(_for_err);
      throw _for_err;
      break;
    }
    break;
  }
 }
 var __iter_k = __get_iter(this.attrvals);
 while (1) {
  try {
   var k = __iter_k.next();
   item2.attrvals[k] = this.attrvals[k];
  }
  catch (_for_err) {
    if (_for_err!==StopIteration) {
      if (_do_iter_err_stacktrace)
       print_stack(_for_err);
      throw _for_err;
      break;
    }
    break;
  }
 }
 return item2;
}
DBItem.prototype.get_attr_type = function(attr) {
 if (!this.types.has(attr))
  throw new DBError("Item "+this+" does not have attr "+attr+".");
 return this.types.get(attr);
}
function AbstractDB(dbtype) {
 this.dbtype = dbtype;
 this.schema = {}
}
exports.AbstractDB = AbstractDB;
create_prototype(AbstractDB);
AbstractDB.open = function() {
}
AbstractDB.prototype.get = function(table, key, value, extra_params) {
}
AbstractDB.prototype.set = function(table, key, item, extra_params) {
}
AbstractDB.prototype.new_row = function(table, key, item, extra_params) {
}
AbstractDB.prototype.instance_item = function(name) {
 if (!(name in this.schema)) {
   throw new DBError("Could not schema item "+name+".");
 }
 return this.schema[name].copy();
}
AbstractDB.prototype.get_item_schema = function(name) {
 if (!(name in this.schema)) {
   throw new DBError("Could not schema item "+name+".");
 }
 return this.schema[name];
}
AbstractDB.prototype.query = function(callback, table, index, attrs, conditions, limit, scan_forward, start_key) {
}
AbstractDB.prototype.load_schema = function(schema) {
 this.schema = schema;
}
function MySQLDB() {
 AbstractDB.call(this);
}
inherit(MySQLDB, AbstractDB);
exports.MySQLDB = MySQLDB;
mysql_ret_obj = new Array();
function mysql_query(handler, query) {
 var mysql=require('mysql');
 var connection=mysql.createConnection({host: 'localhost', user: 'root', database: "webglmodeller", password: ''});
 error = undefined;
 connection.connect(function(err) {
  error = err;
 });
 if (error!=undefined)
  throw error;
 mysql_ret_obj.length = 0;
 var ret=connection.query(query, function(err, rows, fields) {
  mysql_ret_obj.push(handler(err, rows, fields));
  console.log("yay", mysql_ret_obj);
  return true;
 });
 console.log(ret.__proto__);
 connection.end();
 console.log(ret);
 return mysql_ret_obj;
}
MySQLDB.prototype.new_row = function(table, item, extra_params) {
 if (!(table in this.schema)) {
   throw new DBError("Table "+table+" not in schema");
 }
 var schema=this.get_item_schema(table);
 var valstr="";
 var colstr="";
 var i=0;
 var __iter_k = __get_iter(item.attrvals);
 while (1) {
  try {
   var k = __iter_k.next();
   if (!(k in schema.attrs)) {
     throw new DBError("Invalid attr name "+k);
   }
   if (i>0) {
     valstr+=",";
     colstr+=",";
   }
   val = item.attrvals[k];
   if (item.attrs[k]==DBT.STRING)
    val = '"'+val+'"';
   colstr+=k;
   valstr+=val;
   i++;
  }
  catch (_for_err) {
    if (_for_err!==StopIteration) {
      if (_do_iter_err_stacktrace)
       print_stack(_for_err);
      throw _for_err;
      break;
    }
    break;
  }
 }
 function handler(err, rows, fields) {
  if (err)
   throw err;
 }
 query = "INSERT INTO "+table+"("+colstr+")\n"+"VALUES ("+valstr+")\n";
 console.log(query);
 return mysql_query(handler, query);
}
MySQLDB.prototype.get = function(table, key, value, extra_params) {
 var schema=this.get_item_schema(table);
 if (!(key in schema.attrs)) {
   throw new DBError("Key "+key+" not in schema");
 }
 var data=[[]];
 if (schema.attrs[key]==DBT.STRING)
  value = '"'+value+'"';
 query = "SELECT * FROM "+table+" WHERE "+key+"="+value;
 data = mysql_query(function(err, rows, fields) {
  if (err)
   throw err;
  console.log(rows.length);
  var ret=[];
  for (var i=0; i<rows.length; i++) {
    ret.push(rows[i]);
  }
  return ret;
 }, query);
 return data;
}
