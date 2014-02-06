"use strict";

var SchmTypes = {
  BYTE : 0,
  INT : 1,
  FLOAT : 2,
  STRING : 3,
  FIXEDSTRING : 4,
  ARRAY : 5,
  VEC2 : 6,
  VEC3 : 7,
  VEC4 : 8,
  MAT4 : 9,
  COLOR : 10,
  DATAREF : 11,
  OBJECT : 12
};

function SchemaItem(ownerclass, type, data) {
  this.type = type;
  this.data = data;
  this.cls = ownerclass;
};
create_prototype(SchemaItem);

function SchemaStruct(name) {
  this.fields = new GArray();
  this.name = name;
}

function Schema() {
  this.structs = {};
  this.stack = [];
}
create_prototype(Schema);

var _schema = undefined;
function dopack(data, obj) {
  var sc = _schema;
  
  push_pack_stack();
  obj.pack(data);
  var result = pop_pack_stack();
  
  var clsname = obj.constructor.name;
  rec_pack_struct(clsname);
  
  var st = new SchemaStruct(clsname);  
  for (var i=0; i<result.length; i++) {
    var item = result[i];
    item = new SchemaItem(clsname, item[0], item[1]);
    
    st.fields.push(item);
  }
  
  if (!(clsname in sc.structs)) {
    sc.structs[clsname] = st;
  } else {
    var st2 = sc.structs[clsname];
    if (!st2.equals(st)) {
      console.log("ERROR: inconsistent serialization of "+st2.name+"!");
    }
  }
}

