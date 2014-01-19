"yay";
for (var a=0; a<2; a++) {
}

/*
type = function() {
  this.size = undefined;
}

int32 = function() {
  this.size = 4;
}

int16 = function() {
  this.size = 2;
}


float32 = function() {
  this.size = 4;
  
}

StructRef = function(type) {
  this.stype = type;
  this.size = this.stype.size;
}

Array = function(type, size) {
  this.type = type;
  this.typesize = type.size;
  this.len = size;
  
  this.getitem = function(i) {
    return i*this.typesize;
  }
  
  Object.defineProperty(this, "size", {get: function() {
    return this.typesize*this.len;
  }});
}
function Element() {
  this.type = int32;
  this.eid = int32;
  this.gdata = int32;
  this.flag = int32;
  this.index = int32;
}

function Vertex() {
  this.prior = Element;
  this.edge = StructRef(Edge);
}

function ArrBufWrapper() {
  this.a;
}
*/