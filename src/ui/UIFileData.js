"use struct";

//this approach serializes into *bigger* data than raw JS,
//even when the two are compressed
class UIInt {
  constructor(val) {
    this.val = val;
  }
  
  static fromSTRUCT(reader) {
    var obj = new UIInt();
    reader(obj);
    
    return obj.val;
  }
}
UIInt.STRUCT = """
  UIInt {
    val : int;
  }
"""

class UIFloat {
  constructor(val) {
    this.val = val;
  }
  
  static fromSTRUCT(reader) : UIFloat {
    var obj = new UIFloat();
    reader(obj);
    
    return obj.val;
  }
}
UIFloat.STRUCT = """
  UIFloat {
    val : float;
  }
""";

//limited to 16 characters
class UIString {
  constructor(val) {
    this.val = val;
  }
  
  static fromSTRUCT(reader) : UIString {
    var obj = new UIString();
    reader(obj);
    
    return obj.val;
  }
}
UIString.STRUCT = """
  UIString {
    val : string;
  }
"""

class UIFloatArray {
  constructor(val) {
    this.val = val;
  }
  
  static fromSTRUCT(reader) : UIFloatArray {
    var obj = new UIFloatArray();
    reader(obj);
    
    return obj.val;
  }
}
UIFloatArray.STRUCT = """
  UIFloatArray {
    val : array(float);
  }
"""

class UIKeyPair {
  constructor(key, val) {
    this.key = key;
    this.val = val;
  }
  
  static fromSTRUCT(reader) {
    var obj = new UIKeyPair();
    
    reader(obj);
    
    return obj;
  }
  
  get_val() {
    is_num = (typeof(this.val) == "number" || this.val instanceof Number);
    is_num = is_num || (typeof(this.val) == "boolean" || this.val instanceof Boolean);
    
    if (is_num) {
      if (this.val == Math.floor(this.val))
        return new UIInt(this.val);
      else
        return new UIFloat(this.val);
    } else if (typeof(this.val) == "string" || this.val instanceof String) {
      return new UIString(this.val);
    } else if (typeof(this.val) == "array" || this.val instanceof Array) {
      for (var i=0; i<this.val.length; i++) {
        var val = this.val[i];
        is_num = (typeof(val) == "number" || val instanceof Number);
        is_num = is_num || (typeof(val) == "boolean" || val instanceof Boolean);
        if (!is_num) {
          console.log("warning; could not serialize array as numeric array; will do object serialization instead.");
          return new UIStruct(this.val);
        }
      }
      return new UIFloatArray(this.val);
    } else if (typeof(this.val) == "object") {
      return new UIStruct(this.val);
    } else {
      console.log("Warning; bad value passed to UIKeyVal; returning 0. . .");
      return new UIInt(0);
    }
  }
}

UIKeyPair.STRUCT = """
  UIKeyPair {
    key : static_string[16];
    val : abstract(Object) | obj.get_val();
  }
"""

class UIStruct {
  constructor(obj) {
    this.obj = obj;
  }
  
  static fromSTRUCT(reader) {
    var obj = {};
    
    reader(obj);
    var keys = obj.obj;
    var ret = {};
    
    for (var i=0; i<keys.length; i++) {
      var k = keys[i];
      ret[k.key] = k.val;
    }
    
    return ret;
  }
}
UIStruct.STRUCT = """
  UIStruct {
    obj : iter(k, UIKeyPair) | new UIKeyPair(k, obj.obj[k]);
  }
"""

function test_ui_structs() {
  a = new UIStruct({a : 1, b : [1, 2, 3], c : "yay", d : 0.03, e : {a : [1, 2], b : 2}});
  
  var arr = [];
  istruct.write_object(arr, a);
  
  console.log(arr);
  
  var view = new DataView(new Uint8Array(arr).buffer);
  var ret = istruct.read_object(view, UIStruct);
  
  arr = LZString.compress(new Uint8Array(view.buffer));
  
  console.log(ret);
  console.log("- binlen", arr.length);
  console.log("-JSONlen", LZString.compress(JSON.stringify(a.obj)).length);
}
