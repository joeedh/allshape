"use strict";

/* 
  NOTE: be careful when you assume a given datablock reference is not undefined.
*/

/*
 Important (auto-generated) globals:
 
 1. DataTypes, an enumeration mapping data type names (e.g. OBJECT)
    to integer id's.
 2. LinkOrder, a list of data type *integers* that specifies the order
    that data is re-linked after file load.
 3. DataNames, that maps datatype integer id's to UI-friendly type names
    (e.g. Object instead of 0 or OBJECT).
 
 _DataTypeRef is what's used to generate all three globals.
 Each of its items is of the form [TYPENAME, id].
 
 DO NOT EVER EVER CHANGE id;  You can, however,
 change the order of the items to manipulate the 
 order of datablock relinking.
 */
 
//data types, in post-fileload link order
//each item is [type, int_id]; DO NOT CHANGE INT_ID
var _DataTypeDef = [
  ["CSG", 1],
  ["MESH", 2],
  ["OBJECT", 0],
  ["GROUP", 3],
  ["SCENE", 5],
  ["SCRIPT", 4]
];

//generate globals DataTypes and LinkOrder
var DataTypes = {};
var LinkOrder = [];
for (var i=0; i<_DataTypeDef.length; i++) {
  DataTypes[_DataTypeDef[i][0]] = _DataTypeDef[i][1];
  LinkOrder.push(_DataTypeDef[i][1]);
}

// DataNames maps integer data types to ui-friendly names, e.g. DataNames[0] == "Object"
var DataNames = {}
for (var k in DataTypes) {
  DataNames[DataTypes[k]] = k.charAt(0) + k.slice(1, k.length).toLowerCase();
}

//other than SELECT, the first two bytes
//of block.flag are reserved for exclusive
//use by subclasses.  
var BlockFlags = {
  SELECT : 1,
  FAKE_USER : (1<<16)
};

//this function shouldn't be manual; need to automate it
var get_data_typemap = function() {
  var obj = {};
  
  obj[DataTypes.OBJECT] = ASObject;
  obj[DataTypes.MESH] = Mesh;
  obj[DataTypes.SCENE] = Scene;
  
  return obj;
}

class DataRef extends Array {
  constructor(block_or_id, lib=undefined) {
    Array.call(this, 2);
    
    if (lib != undefined && lib instanceof DataLib)
      lib = lib.id;
    
    if (block_or_id instanceof DataBlock) {
      var block = block_or_id;
      this[0] = block.lib_id;
      
      if (lib != undefined)
        this[1] = lib ? lib.id : -1;
      else
        this[1] = block.lib_lib != undefined ? block.lib_lib.id : -1;
    } else if (block_or_id instanceof Array) {
      this[0] = block_or_id[0];
      this[1] = block_or_id[1];
    } else {
      this[0] = block_or_id;
      this[1] = lib != undefined ? lib : -1;
    }
  }
  
  get id() {
    return this[0];
  }
  set id(id) {
    this[0] = id;
  }
  
  get lib() {
    return this[1];
  }
  set lib(lib) {
    this[1] = lib;
  }
  
  equals(b) {
    //XXX we don't compare library id's
    //since lib linking is unimplemented/
    return b != undefined && b[0] == this[0];
  }
}

class DataRefListIter {
  constructor(lst, ctx) {
    this.lst = lst;
    this.i = 0;
    this.datalib = ctx.datalib;
    this.ret = cached_iret();
  }
  
  next() {
    if (this.i < this.lst.length) {
      this.ret.value = this.datalib.get(this.lst[this.i].id);
    } else {
      this.ret.value = undefined;
      this.ret.done = true;
    }
    
    this.i++;
    
    return this.ret;
  }
}

/*
  DataRefList.  A simple container for block references.
  Most of the API will accept either a block or a DataRef.
  
  __iterator__ will use the ids to fetch and return blocks,
  though.
*/
class DataRefList extends GArray {
  constructor(lst=undefined) {
    GArray.call(this);
    
    this.datalib = undefined;
    
    if (lst == undefined)
      return;
    
    if (lst instanceof Array) {
      for (var i=0; i<lst.length; i++) {
        if (lst[i] == undefined) continue;
        
        this.push(lst[i]);
      }
    } else if ("__iterator__" in lst) {
      for (var b in lst) {
        this.push(b);
      }
    }
  }
  
  __iterator__() {
    return new DataRefListIter(this, new Context());
  }
  
  get(i, return_block=true) {
    if (return_block) {
      var dl = this.datalib != undefined ? this.datalib : g_app_state.datalib;
      return dl.get(this[i]);
    } else {
      return this[i];
    }
  }
  
  push(b) {
    if (!(b = this._b(b))) return;
    
    if (b instanceof DataBlock)
      b = new DataRef(b);
    
    GArray.prototype.push.call(this, new DataRef(b));
  }
  
  _b(b) {
    if (b == undefined) {
      console.log("WARNING: undefined passed to DataRefList.push()");
      console.trace();
      return;
    }
    
    if (b instanceof DataBlock) {
      return new DataRef(b);
    } else if (b instanceof DataRef) {
      return b;
    } else {
      console.trace();
      console.log("WARNING: bad value ", b, " passed to DataRefList._b()");
    }
  }
  
  remove(b) {
    if (!(b = this._b(b))) return;
    var i = this.indexOf(b);
    
    if (i < 0) {
      console.trace();
      console.log("WARNING: ", b, " not found in this DataRefList");
      return;
    }
    
    this.pop(i);
  }
  
  pop(i, return_block=true) {
    var ret = GArray.prototype.pop.call(this, i);
    
    if (return_block)
      ret = new Context().datalib.get(ret.id);
      
    return ret;
  }
  
  replace(a, b) {
    if (!(b = this._b(b))) return;
    
    var i = this.indexOf(a);
    if (i < 0) {
      console.trace();
      console.log("WARNING: ", b, " not found in this DataRefList");
      return;
    }
    
    this[i] = b;
  }
  
  indexOf(b) {
    Array.indexOf.call(this, b);
    
    if (!(b = this._b(b))) return;
    
    for (var i=0; i<this.length; i++) {
      if (this[i].id == b.id)
        return i;
    }
    
    return -1;
  }
 
  //inserts *before* index
  insert(index, b) {
    if (!(b = this._b(b))) return;
    
    GArray.prototype.insert.call(this, b);
  }
  
  prepend(b) {
    if (!(b = this._b(b))) return;
    
    GArray.prototype.prepend.call(this, b);
  }
}

class DataList {
  constructor(type) {
    this.list = new GArray();
    this.namemap = {};
    this.type = type;
    this.active = undefined;
  }

  __iterator__() : GArrayIter {
    return this.list.__iterator__();
  }
}

class DataLib {
  constructor() {
    this.id = 0;
    this.datalists = new hashtable();
    this.idmap = {};
    this.idgen = new EIDGen();
  }
  
  get_datalist(typeid) {
    var dl;
    
    if (!this.datalists.has(typeid)) {
      dl = new DataLib(typeid);
      this.datalists.add(dl);
    } else {
      dl = this.datalists.get(typeid);
    }
    
    return dl;
  }
  
  get scenes() {
    return this.get_datalist(DataTypes.SCENE);
  }
  
  get objects() {
    return this.get_datalist(DataTypes.OBJECT);
  }
  
  get meshes() {
    return this.get_datalist(DataTypes.MESH);
  }
  
  search(type, prefix) {
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
  gen_name(block, name) {
    if (name == undefined || name.trim() == "") {
      name = DataNames[block.lib_type];
    }
    
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

  add(block, set_id) {
    if (set_id == undefined)
      set_id = true;
    
    //ensure unique name
    var name = this.gen_name(block, block.name);
    block.name = name;
    
    if (block.lib_id == -1) {
      block.lib_id = this.idgen.gen_id();
    } else {
      this.idgen.max_cur(block.lib_id);
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

  get_active(data_type) {
    if (this.datalists.has(data_type)) {
      var lst = this.datalists.get(data_type);
      
      //we don't allow undefined active blocks
      if (lst.active == undefined && lst.list.length != 0) {
        if (DEBUG.datalib)
          console.log("Initializing active block for " + get_type_names()[data_type]);
        
        lst.active = lst.list[0];
      }
      
      return this.datalists.get(data_type).active;
    } else {
      return undefined;
    }
  }

  get(id) {
    if (id instanceof DataRef)
      id = id.id;
    
    return this.idmap[id];
  }

  pack() {
  }

  static unpack(block, uctx) {
  }
}

class UserRef {
  constructor() {
    this.user = 0;
    this.rem_func = 0;
    this.srcname = "";
  }
}

class DataBlock {
  constructor(type, name) {
    this.constructor.datablock_type = type;
    
    //name is optional
    if (name == undefined)
      name = "unnnamed";
      
    this.name = name;
    this.lib_id = -1;
    this.lib_lib = undefined; //this will be used for library linking
    
    this.lib_type = type;
    this.lib_users = new GArray();
    this.lib_refs = 0;
    this.flag = 0;
  }
  
  on_add(DataLib lib) { }
  on_remove(DataLib lib) { }
  
  copy() { }
  
  init_from_pack() {
    if (this.lib_lib == -1)
      this.lib_lib = undefined;
    
    //need to do anything here?  set lib_lib reference,
    //or leave it as an integer?
  }

  set_fake_user(val) {
    if ((this.flag & BlockFlags.FAKE_USER) && !val) {
      this.flag &= ~BlockFlags.FAKE_USER;
      this.lib_refs -= 1;
    } else if (!(this.flag & BlockFlags.FAKE_USER) && val) {
      this.flag |= BlockFlags.FAKE_USER;
      this.lib_refs += 1;
    }
  }

  toJSON() {
    return {
      lib_id : this.lib_id,
      lib_lib : this.lib_lib,
      name : this.name,
      lib_type : this.lib_type,
      lib_refs : this.lib_refs,
      flag : this.flag,
    };
  }

  //abstract-class fromJSON is not static
  fromJSON(obj) {
    this.lib_id = obj.lib_id;
    this.lib_lib = obj.lib_lib;
    this.name = obj.name;
    this.lib_type = obj.lib_type;
    this.lib_refs = obj.lib_refs;
    this.flag = obj.flag;
  }

  pack(data) {
    pack_int(data, this.lib_id);
    if (this.lib_lib != undefined)
      this.pack_int(this.lib_lib.id);
    else
      this.pack_int(0);
    pack_int(data, this.lib_type);
    pack_int(data, this.lib_refs);
    pack_int(data, this.flag);
    pack_string(data, this.name);
  }

  static unpack(data, uctx) {
    this.lib_id = unpack_int(data, uctx);
    this.lib_lib = unpack_int(data, uctx); //XXX finish linking implementation
    this.lib_type = unpack_int(data, uctx);
    this.lib_refs = unpack_int(data, uctx);
    this.flag = unpack_int(data, uctx);
    this.name = unpack_string(data, uctx);
  }

  //getblock fetchs a datablock from a reference, but doesn't
  //make add user references.
  //
  //the block parameter is there so block substructs
  //can know which block they belong too.
  ///
  //getblock_us does add a user reference automatically.
  //see _Lib_GetBlock and _Lib_GetBlock_us in lib_utils.js.
  data_link(block, getblock, getblock_us) { }

  __hash__() {
    return "DB" + this.lib_id;
  }

  lib_adduser(user, name, remfunc) {
    //remove_lib should be optional?
    
    var ref = new UserRef()
    ref.user = user;
    ref.name = name;
    if (remfunc)
      ref.rem_func = remfunc;
    
    this.lib_users.push(ref);
    this.lib_refs++;
  }

  lib_remuser(user, refname) {
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
  unlink() {
    var users = this.lib_users;
    
    for (var i=0; i<users.length; i++) {
      if (users[i].rem_func != undefined) {
        users[i].rem_func(users[i].user, this);
      }
      
      this.user_rem(users[i]);
    }
  }
}

DataBlock.STRUCT = """
  DataBlock {
    name : string;
    lib_type : int;
    lib_id : int;
    lib_lib : int | obj.lib_lib != undefined ? obj.lib_lib.id : -1;

    lib_refs : int;
    flag : int;
  }
""";
