#include "../server/server_macros.js"

database = require("../../server/js_build/database.js")
fileapi = require("../../server/js_build/fileapi.js")

DBItem = database.DBItem
MySQLDB = database.MySQLDB

/*dbitems are mapped to tables in relational databases*/
schema = {
"users" : new DBItem({
  "userid" : DBT.NUMBER_KEY, 
  "username" : DBT.STRING,
  "name_first" : DBT.STRING, 
  "name_last" : DBT.STRING,
  "email" : DBT.STRING,
  "password" : DBT.STRING,
  "permissions" : DBT.NUMBER,
  "last_login" : DBT.String,
  "average_usage_during_active" : DBT.STRING}),
"authtokens" : new DBItem({
  "tokenid" : DBT.NUMBER_KEY, //is randomly generated
  "type" : DBT.Number,
  "flag" : DBT.Number,
  "create_time" : DBT.String,
  "permissions" : DBT.Number,
  "userid" : DBT.Number,
  "expiration" : DBT.String}),
"filedata" : new DBItem({
  "fileid" : DBT.NUMBER_KEY,
  "parentid" : DBT.Number,
  name : DBT.String,
  cached_path : DBT.String,
  mimeType : DBT.String,
  flag : DBT.Number,
  diskpath : DBT.String,
  modifiedTime : DBT.String,
  accessTime : DBT.String,
  other_meta : DBT.String})
};

db = new MySQLDB()
db.load_schema(schema)

exports.db = db