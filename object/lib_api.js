"use strict";

var DataTypes = {
  OBJECT : 0,
  CSG : 1,
  MESH : 2,
  GROUP : 3,
  SCRIPT : 4,
  SCENE : 5
};

var DataNames = {
  OBJECT : "Object",
  CSG    : "CSG",
  MESH   : "Mesh",
  GROUP  : "Group",
  SCRIPT : "Script",
  SCENE  : "Scene"
};

function DataList() {
  this.list = new GArray();
  this.namemap = {};
}
create_prototype(DataList);

function DataLib() {
  this.id = 0;
  this.datalists = new hashtable();
  this.idmap = {};
};
create_prototype(DataLib);

DataLib.prototype.search = function(type, prefix) {
  //this is what red-black trees are for.
  //oh well.
  
  var list = this.datalists.get(type);
  
  prefix = prefix.toLowerCase();
  
  var ret = new GArray();
  for (var i=0; i<list.list.length; i++) {
    if (list.list[i].strip().toLowerCase().startsWith(prefix)) {
      ret.push(list.list[i]);
    }
  }
  
  return ret;
}

//clearly I need to write a simple string
//processing language with regexpr's
DataLib.prototype.gen_name = function(block, name) {
  if (name == undefined || name.trim() == "") {
    name = DataNames[block.lib_type];
  }
  
  var list = this.datalists(bock.lib_type);
  if (!(name in list.namemap)) {
    block.name = name;
    list.namemap[name] = block;
    return;
  }
  
  var i = 0;
  while (1) {
    i++;
    
    if (name in list.namemap) {
      var j = name.length-1;
      for (j; j>=0; j--) {
        if (name[j] == ".")
          break;
      }
      
      if (name == 0) {
        name = name + "." + i.toString();
        continue;
      }
      
      var s = name.slice(j, name.length);
      if (!Number.isNaN(Number.parseInt(s))) {
        name = name.slice(0, j) + "." + i.toString();
      } else {
        name = name + "." + i.toString();
      }
    } else {
      break;
    }
  }
}

//name may be modified to ensure uniqueness
DataLib.prototype.new_block = function(block, name) {
  name = this.gen_name(name);
 
  block.new_datablock();
  block.name = name;
  this.add(block);
}

DataLib.prototype.add = function(block) {
  this.idmap[block.lib_id] = block;
  
  if (!this.datalists.has(block.lib_type)) {
    this.datalists.add(block.lib_type, {});
  }
  
  this.datalists.get(block.lib_type).list.push(block);
  this.datalists.get(block.lib_type).namemap[block.name] = block;  
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
  this.srcname = "";
}
create_prototype(DataRef);

var _data_api_idgen = 0;
function DataBlock(type, name) {
    //name is optional
    if (name == undefined)
      name = "unnnamed";
    this.lib_name = name;
    this.lib_id = 0;
    this.lib_lib = 0; //this will be used for library linking
    
    this.lib_type = type;
    this.lib_users = new GArray();
    this.lib_refs = 0;
}
create_prototype(DataBlock);

DataBlock.prototype.pack = function(data) {
  pack_int(data, this.lib_id);
  if (this.lib_lib != undefined)
    this.pack_int(this.lib_lib.id);
  else
    this.pack_int(0);
  pack_int(data, this.lib_type);
  pack_int(data, this.lib_refs);
  pack_string(data, this.lib_name);
};

DataBlock.unpack = function(data, uctx) {
  this.lib_id = unpack_int(data, uctx);
  this.lib_lib = unpack_int(data, uctx); //XXX finish linking implementation
  this.lib_type = unpack_int(data, uctx);
  this.lib_refs = unpack_int(data, uctx);
  this.lib_name = unpack_string(data, uctx);
};

DataBlock.prototype.data_link = function(block, getblock) {
};

DataBlock.prototype.__hash__ = function() {
  return "DL" + this.lib_id;
};

DataBlock.new_datablock = function(ob) {
  ob.lib_id = _data_api_idgen++;
};

DataBlock.set_idgen = function(idgen) {
  _data_api_idgen = idgen;
};

DataBlock.prototype.lib_adduser = function(user, name, remfunc) {
  //remove_lib should be optional?
  
  var ref = new DataRef()
  ref.user = user;
  ref.name = name;
  if (remfunc)
    ref.rem_func = remfunc;
  
  this.lib_users.push(ref);
  this.lib_refs++;
}

DataBlock.prototype.lib_remuser = function(user, refname) {
  var newusers = new GArray();
  
  for (var i=0; i<this.lib_users.length; i++) {
    if (this.lib_users[i].user != user && this.lib_users[i].srcname != refname) {
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
};
