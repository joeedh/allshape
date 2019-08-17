"use strict";

var DBDataFlags = {
  SELECT : 1
}

var DBMemberTypes = {
  PROP   : 1,
  DBDATA : 2
}
class DBDataMember {
  constructor(type, name) {
    this.prop = undefined;
    this.name = name;
    this.flag = 0;

    this.type = type;
  }
}

DBDataMember.STRUCT = """
  DBDataMember {
    name : static_string[64];
    type : int;
    prop : ToolProperty;
  }
""";

class DBDataIter {
  constructor(DataBlockData data) {
    this.data = data;
    
    this.ret = {done : false, value : undefined};
    this.keys = Object.keys(data.members);
    this.i = 0;
  }
  
  next() {
    var ret = this.ret;
    
    if (this.i >= this.keys.length) {
      ret.done = true;
      ret.value = undefined;
      
      return ret;
    }
    
    ret.value = this.data.members[this.keys[this.i++]];
    return ret;
  }
  
  reset() {
    this.i = 0;
    this.keys = Object.keys(this.data.members);
    this.ret.done = false;
  }
}

class DataBlockData extends DBDataMember {
  constructor(name) {
    super(DBMemberTypes.DBDATA, name);
    this.members = {};
  }
  
  __iterator__() : DBDataIter {
    return new DBDataIter(this);
  }
  
  add(member, name, ignore_existence=false) {
    if (!ignore_existence && name in this.members) {
      console.trace("----->", this);
      throw new Error(name, "is already in datablockdata group");
    }
    
    if (member instanceof ToolProperty) {
      member = new DBDataMember(DBMemberTypes.PROP, name);
    }
    
    member.parent = this;
    member.name = name; //should already be set.  sanity check
    
    this.members[member] = member;
  }
  
  set(member, name) {
    this.add(member, name, true);
  }
  
  has(name) {
    return name in this.members;
  }
  
  static fromSTRUCT(reader) {
    var ret = new DataBlockData();
    
    reader(ret);
    
    var members = ret.data;
  }
}

DataBlockData.STRUCT = """
  DataBlockData {
    members : iter(DBDataMember);
    name    : static_string[64];
    flag    : int;
  }
""";
