"use strict";

function DataLib() {
  this.datalists = new HashTable();
  this.idmap = {};
};

DataLib.prototype.search = function(type, prefix) {
  //this is what red-black trees are for.
  //oh well.
  
  var list = this.datalists.get(type);
  
  prefix = prefix.toLowerCase();
  
  var ret = new GArray();
  for (var i=0; i<list.length; i++) {
    if (list[i].strip().toLowerCase().startsWith(prefix)) {
      ret.push(list[i]);
    }
  }
  
  return ret;
}

DataLib.prototype.new_block = function(block) {
  block.new_datablock();
  this.add(block);
}

DataLib.prototype.add = function(block) {
  this.idmap[block.lib_id] = block;
  if (!this.datalists.has(block.lib_type)) {
    this.datalists.add(block.lib_type, new GArray());
  }
  
  this.datalists.get(block.lib_type).push(block);
}

DataLib.prototype.get = function(id) {
  return this.idmap[id];
}

DataLib.prototype.pack = function() {
};

DataLib.unpack = function(block, uctx) {
};

function DataRef() {
  this.user = 0;
  this.rem_func = 0;
}
create_prototype(DataRef);

var DataTypes = {
  OBJECT : 0,
  CSG : 1,
  MESH : 2,
  GROUP : 3,
  SCRIPT : 4,
  SCENE : 5
};

var _data_api_idgen = 0;
function DataBlock(type, name) {
    //name is optional
    if (name == undefined)
      name = "unnnamed";
    this.lib_name = name;
    this.lib_id = 0;
    
    this.lib_type = type;
    this.lib_users = new GArray();
    this.lib_refs = 0;
}
create_prototype(DataBlock);

DataBlock.prototype.pack = function(data) {
  pack_int(data, this.lib_id);
  pack_int(data, this.lib_type);
  pack_int(data, this.lib_refs);
  pack_string(data, this.lib_name);
};

DataBlock.unpack = function(data, uctx) {
  this.lib_id = unpack_int(data, uctx);
  this.lib_type = unpack_int(data, uctx);
  this.lib_refs = unpack_int(data, uctx);
  this.lib_name = unpack_string(data, uctx);
};

DataBlock.prototype.__hash__ = function() {
  return "DL" + this.lib_id;
}

DataBlock.new_datablock = function(ob) {
  ob.lib_id = _data_api_idgen++;
}

DataBlock.set_idgen = function(idgen) {
  _data_api_idgen = idgen;
}

DataBlock.prototype.lib_adduser = function(user_ref) {
  //remove_lib should be optional?
  
  this.lib_users.push(user_ref);
  this.lib_refs++;
}

DataBlock.prototype.lib_remuser = function(user_ref) {
  var newusers = new GArray();
  
  for (var i=0; i<this.lib_users.length; i++) {
    if (this.lib_users[i] != user_ref) {
      newusers.push(this.lib_users[i]);
    }
  }
  
  this.lib_users = newusers;
  this.lib_refs--;
}

//removes all references to a datablock from referencing objects
DataBlock.prototype.unlink = function() {
  var users = this.lib_users;
  
  for (var i=0; i<users.length; i++) {
    if (users[i].rem_func != undefined) {
      users[i].rem_func(users[i].user, this);
    }
    
    this.user_rem(users[i]);
  }
}
