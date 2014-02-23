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

//this function shouldn't be manual; need to automate it
var get_data_typemap = function() {
  var obj = {};
  
  obj[DataTypes.OBJECT] = ASObject;
  obj[DataTypes.MESH] = Mesh;
  obj[DataTypes.SCENE] = Scene;
  
  return obj;
}

function DataList(type) {
  this.list = new GArray();
  this.namemap = {};
  this.type = type;
  this.active = undefined;
}
create_prototype(DataList);

DataList.prototype.__iterator__ = function() {
  return this.list.__iterator__();
}

function DataLib() {
  this.id = 0;
  this.datalists = new hashtable();
  this.idmap = {};
  this.idgen = new EIDGen();
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
  
  console.log(block, name);
  if (!this.datalists.has(block.lib_type)) {
    this.datalists.set(block.lib_type, new DataList(block.lib_type));
  }
  
  var list = this.datalists.get(block.lib_type);
  if (!(name in list.namemap)) {
    return name;
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
  
  return name;
}

DataLib.prototype.add = function(block) {
  //ensure unique name
  var name = this.gen_name(block, block.name);
  block.name = name;
  
  console.log("YAYAY");
  if (block.lib_id == -1) {
    block.lib_id = this.idgen.gen_id();
  }
  
  this.idmap[block.lib_id] = block;
  
  if (!this.datalists.has(block.lib_type)) {
    this.datalists.set(block.lib_type, new DataList(block.lib_type));
  }
  
  var dl = this.datalists.get(block.lib_type);
  if (dl.active == undefined)
    dl.active = block;
    
  dl.list.push(block);
  dl.namemap[block.name] = block;
  
  block.on_add(this);
}

DataLib.prototype.get_active = function(data_type) {
  if (this.datalists.has(data_type)) {
    return this.datalists.get(data_type).active;
  } else {
    return undefined;
  }
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

var DBFlags = {FAKE_USER : 1};
function DataBlock(type, name) {
    //name is optional
    if (name == undefined)
      name = "unnnamed";
      
    this.name = name;
    this.lib_id = -1;
    this.lib_lib = undefined; //this will be used for library linking
    
    this.lib_type = type;
    this.lib_users = new GArray();
    this.lib_refs = 0;
    this.lib_flag = 0;
}
create_prototype(DataBlock);

DataBlock.STRUCT = """
  DataBlock {
    name : string;
    lib_type : int;
    lib_id : int;
    lib_lib : int | obj.lib_lib != undefined ? obj.lib_lib.id : -1;

    lib_refs : int;
    lib_flag : int;
  }
""";

DataBlock.prototype.on_add = function(DataLib lib) {
}

DataBlock.prototype.on_remove = function(DataLib lib) {
}

DataBlock.prototype.init_from_pack = function() {
  if (this.lib_lib == -1)
    this.lib_lib = undefined;
  
  //need to do anything here?  set lib_lib reference,
  //or leave it as an integer?
}

DataBlock.prototype.set_fake_user = function(val) {
  if ((this.lib_flag & DBFlags.FAKE_USER) && !val) {
    this.lib_flag &= ~DBFlags.FAKE_USER;
    this.lib_refs -= 1;
  } else if (!(this.lib_flag & DBFlags.FAKE_USER) && val) {
    this.lib_flag |= DBFlags.FAKE_USER;
    this.lib_refs += 1;
  }
}

DataBlock.prototype.toJSON = function() {
  return {
    lib_id : this.lib_id,
    lib_lib : this.lib_lib,
    name : this.name,
    lib_type : this.lib_type,
    lib_refs : this.lib_refs,
    lib_flag : this.lib_flag,
  };
}

//abstract-class fromJSON is not static
DataBlock.prototype.fromJSON = function(obj) {
  this.lib_id = obj.lib_id;
  this.lib_lib = obj.lib_lib;
  this.name = obj.name;
  this.lib_type = obj.lib_type;
  this.lib_refs = obj.lib_refs;
  this.lib_flag = obj.lib_flag;
}

DataBlock.prototype.pack = function(data) {
  pack_int(data, this.lib_id);
  if (this.lib_lib != undefined)
    this.pack_int(this.lib_lib.id);
  else
    this.pack_int(0);
  pack_int(data, this.lib_type);
  pack_int(data, this.lib_refs);
  pack_int(data, this.lib_flag);
  pack_string(data, this.name);
};

DataBlock.unpack = function(data, uctx) {
  this.lib_id = unpack_int(data, uctx);
  this.lib_lib = unpack_int(data, uctx); //XXX finish linking implementation
  this.lib_type = unpack_int(data, uctx);
  this.lib_refs = unpack_int(data, uctx);
  this.lib_flag = unpack_int(data, uctx);
  this.name = unpack_string(data, uctx);
};

//getblock fetchs a datablock from a reference, but doesn't
//make add user references.
//getblock_us does add a user reference automatically.
//see _Lib_GetBlock and _Lib_GetBlock_us in lib_utils.js.
DataBlock.prototype.data_link = function(block, getblock, getblock_us) {
};

DataBlock.prototype.__hash__ = function() {
  return "DL" + this.lib_id;
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
