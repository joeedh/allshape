"use strict";
function no_docstring() {
 var a=0;
 var c=1;
 return a+c;
}
function bleh() {

}
bleh.__doc__ = "doc";
var a=function() {
 this.b = function() {
  if (c) {
    var func=define_docstring(function() {
     "no!";
    }, "no!"), , func2=define_docstring(function() {
     "yeek!";
    }, "yeek!"), ;
    define_docstring(function(bleh) {
     "evil!";
     return bleh(define_docstring(function() {
      "no good";
     }, "no good"), function() {
      "no good";
     });
    }, "evil!");
    function(bleh) {
     "evil!";
     return bleh(define_docstring(function() {
      "no good";
     }, "no good"), function() {
      "no good";
     });
    }
  }
 }
 this.b.__doc__ = "eek!";
}
A.prototype.b = function() {

}
A.prototype.b.__doc__ = "yay";
function ClsTest() {
 Object.apply(this, arguments);
}
inherit_multiple(ClsTest, [Object]);
ClsTest.prototype.p_a = function() {

}
ClsTest.prototype.p_a.__doc__ = "test";
ClsTest.prototype.p_b = function() {

}
ClsTest.prototype.p_b.__doc__ = "test2";
ClsTst;
