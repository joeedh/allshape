"use strict";

typed class Struct extends b {
  var int a, b, d[2][3][4] = [[2,   3, 3], [3, 2, 1]], e;
  
  constructor(a, b, c, d) {
    console.log("yay");
  }
  
  get A() : int {
    return this.a;
  }
  
  set A(int a) {
    this.a = a;
  }
  
  get a2() : float {
    return this.d[1][2][3];
  }
  
  set b2(int d) {
    function helper() {
      return 2;
    }
  }
  
  some_method(int arg) : float {
    this.e = arg;
    this.a = arg;
    arg = this.A;
    this.A = 0;
    
    return this.e*arg;
  }
}
