#include "../server/server_macros.js"

var events = require("events")

DBTypes = {}
DBFieldTypes = DBT = {STRING: "S", NUMBER_KEY: "NK", NUMBER: "N", BINARY : "B", NUMBERSET : "NS", BINARYSET : "BS"}
js_type_DBFieldTypes = {"S" : String, "N" : Number, "B" : ArrayBuffer, "NS" : set, "BS" : set}

function DBError(msg) {
  Error.call(this);
  this.message = msg;
}
inherit(DBError, Error);
EXPORT_FUNC(DBError);

DBError.toString = function() {
  return this.constructor.name + ": d" + this.msg
}

DBError.valueOf = function() {
  return this.toString()
}

function DBConditionalCheckFailedException(msg) {
  DBError.call(msg);
}
inherit(DBConditionalCheckFailedException, DBError);
EXPORT_FUNC(DBConditionalCheckFailedException);

function DBValidationException(msg) {
  DBError.call(msg);
}
inherit(DBValidationException, DBError);
EXPORT_FUNC(DBValidationException);


D_INVALID = undefined
D_EQ = 1 //note: all comparison operations treat binary data as *unsigned*
D_LE = 2
D_LT = 3
D_GE = 4
D_GT = 5
D_BEGINS_WITH = 6
D_BETWEEN = 7
D_NOT_CONTAINS = 8
D_IN = 9

DOP = {"==": D_EQ, "<": D_LT, "<=": D_LE, ">=": D_GE, ">": D_GT, 
       "BEGINS_WITH" : D_BEGINS_WITH, "BETWEEN": D_BETWEEN,
       "NOT_CONTAINS" : D_NOT_CONTAINS, "IN": D_IN}

function DBCmp(type, attrs) {
  this.type = type;
  this.attrs = attrs;
  
  if (attrs instanceof String) {
    attrs = [attrs];
  }
}
EXPORT_FUNC(DBCmp);

function DBItem(attrs, vals) { //vals is optional
  this.attrs = attrs;
  this.attrvals = {};
  if (vals == undefined) {
    vals = {}
  }
  
  for (var k in vals) {
    if (!(k in attrs)) {
      throw new DBError("Attr value not in attr type map");
    }
    
    this.attrvals[k] = vals[k];
  }
}
inherit(DBItem, utils.hashtable);
EXPORT_FUNC(DBItem);

DBItem.prototype.copy = function() : DBItem {
  var item2 = new DBItem({});
  
  for (var k in this.attrs) {
    item2.attrs[k] = this.attrs[k];
  }
  
  for (var k in this.attrvals) {
    item2.attrvals[k] = this.attrvals[k];
  }
  
  return item2;
}

DBItem.prototype.get_attr_type = function(attr) {
  if (!this.types.has(attr))
    throw new DBError("Item " + this + " does not have attr " + attr + ".")
    
  return this.types.get(attr);
}

function AbstractDB(dbtype) {
  this.dbtype = dbtype
  this.schema = {};
}
EXPORT_FUNC(AbstractDB);

create_prototype(AbstractDB)

//arguments are dependent on child classes
//this somewhat mirrors the Amazon AWS DynamoDB API

AbstractDB.open = function() { }
AbstractDB.prototype.get = function(String table, String key, String value, extra_params) { }

//extra_params is optional and is implementation-specific, defaults to {}
//attrs_exit_check is a list of attr_name:fail_mode pairs,
//where fail_mode is either 
//  * true (the operation fails if the attr value attr *doesn't* exists) 
//  * false (the operation fails if the attr value *does* exist).
AbstractDB.prototype.set = function(String table, String key, DBItem item, extra_params) { }
AbstractDB.prototype.new_row = function(String table, String key, DBItem item, extra_params) { }

AbstractDB.prototype.instance_item = function(String name) {
  if (!(name in this.schema)) {
    throw new DBError("Could not schema item " + name + ".");
  }
  
  return this.schema[name].copy();
}

AbstractDB.prototype.get_item_schema = function(String name) {
  if (!(name in this.schema)) {
    throw new DBError("Could not schema item " + name + ".");
  }
  
  return this.schema[name];
}
//consumed_capacity is optional, defaults to undefined.
function DBQueryCallback(error, items, last_key, consumed_capacity); 

//if attrs is undefined, all attributes are returned
AbstractDB.prototype.query = function(
  DBQueryCallback callback, String table, String index,  
  Array<String> attrs, 
  conditions, limit, scan_forward, start_key) {} 

AbstractDB.prototype.load_schema = function(schema) {
  this.schema = schema;
}


function MySQLDB() {
  AbstractDB.call(this);
}
inherit(MySQLDB, AbstractDB);
EXPORT_FUNC(MySQLDB);

mysql_ret_obj = new Array()
function mysql_query(handler, query) {
  var mysql      = require('mysql');
  var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    database : "webglmodeller",
    password : '',
  });
  
  //query = connection.escape(query)
  
  error = undefined;
  connection.connect(function(err) {
    error = err;
  });

  if (error != undefined) throw error;
  
  mysql_ret_obj.length = 0;
  var ret = connection.query(query, function(err, rows, fields) {
    mysql_ret_obj.push(handler(err, rows, fields));
    console.log("yay", mysql_ret_obj)
    
    return true;
  });
  
  console.log(ret.__proto__)
  connection.end();
  console.log(ret)
  
  return mysql_ret_obj
}

MySQLDB.prototype.new_row = function(table, item, extra_params) {
  if (!(table in this.schema)) {
    throw new DBError("Table " + table + " not in schema");
  }
  
  var schema = this.get_item_schema(table);
  
  var valstr = ""
  var colstr = ""
  var i = 0;
  for (var k in item.attrvals) {
    if (!(k in schema.attrs)) {
      throw new DBError("Invalid attr name " + k);
    }
    if (i > 0) {
      valstr += ","
      colstr += ","
    }
    
    val = item.attrvals[k]
    if (item.attrs[k] == DBT.STRING)
      val = '"' + val + '"'
      
    colstr += k
    valstr += val
    i++;
  }
  
  function handler(err, rows, fields) {
    if (err) throw err;
  }

  query = "INSERT INTO " + table + "(" + colstr + ")\n" + "VALUES (" + valstr + ")\n"
  console.log(query)
  
  return mysql_query(handler, query)
}

MySQLDB.prototype.get = function(table, key, value, extra_params) {
  var schema = this.get_item_schema(table);
  if (!(key in schema.attrs)) {
    throw new DBError("Key " + key + " not in schema");
  }
  
  var data = [[]]
  
  if (schema.attrs[key] == DBT.STRING)
    value = '"' + value + '"'
    
  query = "SELECT * FROM " + table + " WHERE " + key + "=" + value
  
  data = mysql_query(function (err, rows, fields) {
    if (err) throw err;
    
    console.log(rows.length)
    var ret = []
    
    for (var i=0; i<rows.length; i++) {
      ret.push(rows[i]);
    }
    
    return ret;
  }, query);
  
  return data;
}
  