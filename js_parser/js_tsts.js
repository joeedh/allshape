/*
native function print(String str);
native function fstr(float f) : String;

function tst2(int i) : int {
  return i+1;
}

function tst(int i) : int {
  return i;
}

arrlit = [0, 1, 2, 3];
objlit = {a: 1, b: 2, c: 3};

function main(int a, float b) {
  print(fstr(a/2));
  
  global c;
  
  this.a = 1 : int;
  this.b = 2 : float;
  this.c = "yay" : String;
  this.e = [0, 1, 2, 3];
  a = 1;
  b = 2;
  c = 3;
  var d = 4;
  var g = 5;
  
  this.bleh = function(a, b) {
    console.log("yay!");
  }
  
  if (a == 3) {
    print("awesome");
  } else if (a == 2) {
    print(":)");
    a = 1;
  } else if (a == 3) {
    print(";)");
  } else {
    print("yay, else")
    
    a = 2234.23432;
  }
  
  print("past if")
  
  return tst(-1);
}

global t;
var Vector3 n = null;

var m = new main();

this.__iterator__ = function() {
  return this;
}

m += 2;
t+=1, n=2, m+=3;
var obj = {p: 1, c: 2, d: 3};
var arr = [0, 1, 2, 3]
this.tst = "sd" : Array<a>;
// */
var i;
for (var e in mesh.edges) {
  for (i=0; i<3; i++) {
    edgebuf.push(e.v1.co[i]);
  }
  for (i=0; i<3; i++) {
    edgebuf.push(e.v2.co[i]);
  }
}