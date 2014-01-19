function nested_with_test() {
 this.scope_a = {a: 0}
 this.scope_b = {b: 1}
 
 this.next = function() {
 
  with ({scope_a: this.scope_a, scope_b: this.scope_b}) {
    function frame_1() {
     with (scope_a) {
       function frame_2() {
        with (scope_b) {
          console.log(a);
          console.log(b);
        }
       }
       frame_2();
     }
    }    
    frame_1();
  }
  
 }
}

function test_nested_with() {
 console.log("testing nested with");
 
 var tst=new nested_with_test();
 tst.next();
}