"use strict";

class MyKeyboardEvent {
  constructor(code, shift=false, ctrl=false, alt=false) {
    this.keyCode = code;
    this.shiftKey = shift;
    this.ctrlKey = ctrl;
    this.altKey = alt;
  }
}

class MyMouseEvent {
  constructor(int x, int y, short button, short type) {
    this.x = x; this.y = y;
    this.button = button;
    this.type = type;
    
    this.touches = {};
  }
  
  copy(Array<float> sub_offset = undefined) : MyMouseEvent {
    var ret = new MyMouseEvent(this.x, this.y, this.button, this.type);
    
    for (var k in this.touches) {
      var t = this.touches[k];
      var x = t[0], y = t[1];
      
      if (sub_offset) {
        x -= sub_offset[0];
        y -= sub_offset[1];
      }
      
      ret.touches[k] = [x, y];
    }
    
    return ret;
  }
}

/*enumeration values for MyMouseEvent.type*/
MyMouseEvent.MOUSEMOVE = 0
MyMouseEvent.MOUSEDOWN = 1
MyMouseEvent.MOUSEUP   = 2
MyMouseEvent.LEFT  = 0
MyMouseEvent.RIGHT = 1

/*going to use DOM event structure for this one*/
/*class KeyEvent {
  constructor(key, keyascii, type) {
    this.key = key;
    this.keyascii = keyascii;
    this.type = type;

    //enumeration values for this.type
    this.KEYDOWN = 0;
    this.KEYUP = 1;
    this.KEYREPEAT = 2;
  }
}*/

//used to keep right click menus from cancelling certain tools
var _swap_next_mouseup = false;
var _swap_next_mouseup_button = 2;
function swap_next_mouseup_event(button) {
  _swap_next_mouseup = true;
  _swap_next_mouseup_button = button;
}

var _ignore_next_mouseup = false;
var _ignore_next_mouseup_button = 2;
function ignore_next_mouseup_event(button) {
  _ignore_next_mouseup = true;
  _ignore_next_mouseup_button = button;
}

class EventHandler {
  constructor() {
    this.modalstack = new Array<EventHandler>();
    this.modalhandler = null;
    this.keymap = null;
  }

  on_keydown(KeyboardEvent event) { }
  on_charcode(KeyboardEvent event) { }
  on_keyinput(KeyboardEvent event) { }
  on_keyup(KeyboardEvent event) { }
  on_mousemove(MouseEvent event) { }
  on_mousedown(MouseEvent event) { }
  
  on_gl_lost(WebGLRenderingContext new_gl) { }
  
  //touch events
  on_mouseup2(MouseEvent event) { }
  on_mouseup3(MouseEvent event) { }
  
  on_mousedown2(MouseEvent event) { }
  on_mousedown3(MouseEvent event) { }
  
  on_mousemove2(MouseEvent event) { }
  on_mousemove3(MouseEvent event) { }
  
  on_mousewheel(MouseEvent event) { }
  on_mouseup(MouseEvent event) { }
  on_resize(Array<int> newsize) { }
  on_contextchange(Object event) { }
  on_draw(WebGLRenderingContext gl) { }

  has_modal() {
      return this.modalhandler != null;
  }

  push_modal(EventHandler handler) 
  {
    if (this.modalhandler != null) {
      this.modalstack.push(this.modalhandler);
    }
    this.modalhandler = handler;
    
    //console.log("Pushing modal handler", handler.constructor.name, this.modalstack.length);
  }

  pop_modal() 
  {
    if (this.modalhandler != null) {
      //console.log("Popping modal handler", this.modalhandler.constructor.name, this.modalstack.length);
    }
    
    if (this.modalstack.length > 0) {
      this.modalhandler = this.modalstack.pop();
    } else {
      this.modalhandler = null;
    }
  }

  //resize events aren't modal
  _on_resize(Array<int> newsize) 
  { 
    this.on_resize(event);
  }

  _on_keydown(KeyboardEvent event) 
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_keydown(event);
    else
      this.on_keydown(event);
  }

  _on_charcode(KeyboardEvent event) 
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_charcode(event);
    else
      this.on_charcode(event);
  }

  _on_keyinput(InputEvent event) 
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_keyinput(event);
    else
      this.on_keyinput(event);
  }

  _on_keyup(KeyboardEvent event) 
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_keyup(event);
    else
      this.on_keyup(event);
  }

  _on_mousemove(MouseEvent event)
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_mousemove(event);
    else
      this.on_mousemove(event);
  }

  _on_mousedown(MouseEvent event)
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_mousedown(event);
    else
      this.on_mousedown(event);
  }
    
  _on_mouseup(MouseEvent event)
  { 
    if (_swap_next_mouseup && event.button == _swap_next_mouseup_button) {
      event.button = _swap_next_mouseup_button==2 ? 0 : 2;
      _swap_next_mouseup = false;
    }
    
    if (_ignore_next_mouseup && event.button == _ignore_next_mouseup_button) {
      _ignore_next_mouseup = false;
      return;
    }
    
    if (this.modalhandler != null)
      this.modalhandler.on_mouseup(event);
    else
      this.on_mouseup(event);
  }

  //# $(DomMouseEvent, Number).void
  _on_mousewheel(MouseEvent event, float delta)
  { 
    if (this.modalhandler != null)
      this.modalhandler.on_mousewheel(event, delta);
    else
      this.on_mousewheel(event, delta);
  }
}

var valid_modifiers = {"SHIFT": 1, "CTRL": 2, "ALT": 4}

var charmap_latin_1 = {
  "Space": 32,
  "Escape" : 27,
  "Enter": 13,
  "Up" : 38,
  "Down" : 40,
  "Left": 37,
  "Right": 39,
  
  "Num0": 96,
  "Num1": 97,
  "Num2": 98,
  "Num3": 99,
  "Num4": 100,
  "Num5": 101,
  "Num6": 102,
  "Num7": 103,
  "Num8": 104,
  "Num9": 105,
  "Home": 36,
  "End": 35,
  "Delete": 46,
  "Backspace": 8,
  "Insert": 45,
  "PageUp": 33,
  "PageDown": 34,
  "Tab" : 9,
  "-" : 189,
  "=" : 187,
  "NumPlus" : 107,
  "NumMinus" : 109,
  "Shift" : 16,
  "Ctrl" : 17,
  "Control" : 17,
  "Alt" : 18
}

for (var i=0; i<26; i++) {
  charmap_latin_1[String.fromCharCode(i+65)] = i+65
}
for (var i=0; i<10; i++) {
  charmap_latin_1[String.fromCharCode(i+48)] = i+48
}

for (var k in charmap_latin_1) {
  charmap_latin_1[charmap_latin_1[k]] = k;
}

var charmap_latin_1_rev = {}
for (var k in charmap_latin_1) {
  charmap_latin_1_rev[charmap_latin_1[k]] = k
}

var charmap = charmap_latin_1;
var charmap_rev = charmap_latin_1_rev;

class KeyHandler {
  constructor(key, modifiers, uiname, menunum, ignore_charmap_error) { //menunum is optional, defaults to undefined
    if (!charmap.hasOwnProperty(key)) {
      if (ignore_charmap_error != undefined && ignore_charmap_error != true) {
        console.trace();
        console.log("Invalid hotkey " + key + "!");
      }
      
      this.key = 0;
      this.keyAscii = "[corrupted hotkey]"
      this.shift = this.alt = this.ctrl = false;
      return
    }
    
    if (typeof(key) == "string") {
      if (key.length == 1)
        key = key.toUpperCase()
    
      this.keyAscii = key
      this.key = charmap[key];
    } else {
      this.key = key;
      this.keyAscii = charmap[key]
    }
    
    this.shift = this.alt = this.ctrl = false;
    this.menunum = menunum
    
    for (var i=0; i<modifiers.length; i++) {
      if (modifiers[i] == "SHIFT") {
        this.shift = true;
      } else if (modifiers[i] == "ALT") {
        this.alt = true;
      } else if (modifiers[i] == "CTRL") {
        this.ctrl = true;
      } else {
        console.trace()
        console.log("Warning: invalid modifier " + modifiers[i] + " in KeyHandler")
      }
    }
  }
  
  build_str(add_menu_num) : String {
    var s = ""
    if (this.ctrl) s += "CTRL-"
    if (this.alt) s += "ALT-"
    if (this.shift) s += "SHIFT-"
    
    s += this.keyAscii
    
    return s;
  }
  
  __hash__() : String {
    return this.build_str(false)
  }
}

class KeyMap extends hashtable {
  constructor() {
    hashtable.call(this);
    
    this.op_map = new hashtable();
  }

  get_tool_handler(toolstr) {
    if (this.op_map.has(toolstr))
      return this.op_map.get(toolstr);
  }

  add_tool(keyhandler, toolstr) {
    this.add(keyhandler, new ToolKeyHandler(toolstr));
    this.op_map.add(toolstr, keyhandler);
  }

  add_func(keyhandler, func) {
    this.add(keyhandler, new FuncKeyHandler(func));
  }

  add(keyhandler, value) {
    if (this.has(keyhandler)) {
      console.trace()
      console.log("Duplicate hotkey definition!")
    }
    
    if (value instanceof ToolKeyHandler) {
      value.tool.keyhandler = keyhandler;
    }
    
    hashtable.prototype.add.call(this, keyhandler, value);
  }

  process_event(Context ctx, KeyboardEvent event) : Object {
    var modlist = []
    if (event.ctrlKey) modlist.push("CTRL")
    if (event.shiftKey) modlist.push("SHIFT")
    if (event.altKey) modlist.push("ALT")
    
    var key = new KeyHandler(event.keyCode, modlist, 0, 0, true);
    
    if (this.has(key)) {
      ctx.keymap_mpos = ctx.view3d.mpos;
      return this.get(key);
    }
    
    return undefined;
  }
}

class KeyHandlerCls {
  handle(Context ctx) {
  }
}

class ToolKeyHandler extends KeyHandlerCls {
  constructor(ToolOp tool) {
    this.tool = tool;
  }
  
  handle(ctx) {
    var tool = this.tool; 
    ctx.api.call_op(ctx, tool);
  }
}

class FuncKeyHandler extends KeyHandlerCls {
  constructor(func) {
    this.handle = func;
  }
}
