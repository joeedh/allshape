"use strict";

class MyKeyboardEvent {
  constructor(int code, shift=false, ctrl=false, alt=false) {
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
    this.touch_manager = undefined;
    this.touch_delay_stack = [];
  }
  
  push_touch_delay(int delay_ms) {
    this.touch_delay_stack.push(this.touch_delay);
    this.touch_delay = delay_ms;
  }
  
  pop_touch_delay() {
    if (this.touch_delay_stack.length == 0) {
      console.log("Invalid call to EventHandler.pop_touch_delay!");
      return;
    }
    
    this.touch_delay = this.touch_delay_stack.pop();
  }
  
  set touch_delay(int delay_ms) {
    if (delay_ms == 0) {
      this.touch_manager = undefined;
    } else {
      if (this.touch_manager == undefined)
        this.touch_manager = new TouchEventManager(this, delay_ms);
      else
        this.touch_manager.delay = delay_ms;
    }
  }
  
  get touch_delay() : int {
    if (this.touch_manager == undefined)
      return 0;
    
    return this.touch_manager.delay;
  }
  
  on_tick() {
    if (this.touch_manager != undefined)
      this.touch_manager.process();
  }
  
  bad_event(Event event) { 
    var tm = this.touch_manager;
    
    if (tm == undefined)
      return false;
    
    if (this.touch_manager != undefined)
      this.touch_manager.process();
    //if (this instanceof View3DHandler)
    //  console.log(event._good, "in bad_event", this.touch_manager, event);
    
    if (tm != undefined && event instanceof MyMouseEvent) {
      //count touch events
      var i=0;
      for (var k in event.touches) {
        i++;
      }
      //only consider touch events
      if (i==0) return false;
      if ("_good" in event) return false;
      
      //console.log("bad event!");
      this.touch_manager.queue_event(event);
      
      return true;
    }
    
    return false;
  }
  
  on_textinput(Object event) { }
  on_keydown(KeyboardEvent event) { }
  on_charcode(KeyboardEvent event) { }
  on_keyinput(KeyboardEvent event) { }
  on_keyup(KeyboardEvent event) { }
  on_mousemove(MouseEvent event) { }
  on_mousedown(MouseEvent event) { }
  on_pan(Array<float> pan, Array<float> last_pan) { }
  
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
  
  _on_pan(Array<float> pan, Array<float> last_pan)
  {
    if (this.modalhandler != null)
      this.modalhandler.on_pan(event);
    else
      this.on_pan(event);
  }
  
  _on_textinput(ObjectMap event)
  {
    if (this.modalhandler != null)
      this.modalhandler.on_textinput(event);
    else
      this.on_textinput(event);
  }
  
  _on_keydown(KeyboardEvent event) 
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_keydown(event);
    else
      this.on_keydown(event);
  }

  _on_charcode(KeyboardEvent event) 
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_charcode(event);
    else
      this.on_charcode(event);
  }

  _on_keyinput(InputEvent event) 
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_keyinput(event);
    else
      this.on_keyinput(event);
  }

  _on_keyup(KeyboardEvent event) 
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_keyup(event);
    else
      this.on_keyup(event);
  }

  _on_mousemove(MouseEvent event)
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_mousemove(event);
    else
      this.on_mousemove(event);
  }

  _on_mousedown(MouseEvent event)
  { 
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null)
      this.modalhandler.on_mousedown(event);
    else
      this.on_mousedown(event);
  }
    
  _on_mouseup(MouseEvent event)
  { 
    if (this.bad_event(event)) return;
    
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
    if (this.bad_event(event)) return;
    
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

//helper class for implementing velocity pan
class VelocityPan extends EventHandler {
  constructor() {
    this.start_mpos = new Vector2();
    this.last_mpos = new Vector2();
    
    this.mpos = new Vector2();

    this.start_time = 0;
    this.owner = undefined : EventHandler;
    
    this.coasting = false;
    this.panning = false;
    this.was_touch = false;
    
    this.vel = new Vector2();
    this.pan = new Vector2();
    this.damp = 0.9;
    
    this.start_pan = new Vector2();
    
    this.last_ms = 0;
    this.vel = new Vector2();
  }
  
  on_tick() {
    if (this.coasting) {
      static vel = new Vector2();
      var damp = 0.99;
      
      vel.load(this.vel);
      vel.mulScalar(time_ms() - this.last_ms);
      this.vel.mulScalar(damp);
      
      this.last_ms = time_ms();
      
      this.pan.sub(vel);
      this.clamp_pan();
      this.owner.on_pan(this.pan, this.start_pan);
    }
  }
  
  calc_vel() {
    var t = time_ms() - this.start_time;
    this.vel.load(this.last_mpos).sub(this.mpos).divideScalar(t);
    this.coasting = (this.vel.vectorLength() > 0.0);
    this.last_ms = time_ms();
  }
  
  start(Array<float> mpos, UIElement owner) {
    this.coasting = false;
    this.last_mpos.load(mpos);
    
    if (this.panning) {
      console.log("warning, duplicate call to VelocityPan.start()");
      this.end();
    }
    
    this.panning = true;
    this.owner = owner;
    
    this.start_pan.load(this.pan);
    this.start_mpos.load(mpos);
    
    this.start_time = time_ms();
    this.was_touch = g_app_state.was_touch;
    
    //feed a mousemove event
    this.do_mousemove(mpos);
  }
  
  end() {
    if (this.panning) {
      this.owner.pop_modal();
    }
    this.panning = false;
    this.calc_vel();
  }
  
  do_mousemove(Array<float> mpos) {
    //console.log("mpos", mpos);
    
    this.last_mpos.load(this.mpos);
    this.mpos.load(mpos);
    
    this.pan[0] = this.start_pan[0] + mpos[0] - this.start_mpos[0];
    this.pan[1] = this.start_pan[1] + mpos[1] - this.start_mpos[1];
    
    this.clamp_pan();
    this.owner.on_pan(this.pan, this.start_pan);
  }
  
  clamp_pan() {
    var bs = this.owner.pan_bounds;
    var p = this.pan;

    for (var i=0; i<2; i++) {
      p[i] = Math.min(Math.max(bs[0][i], p[i]), bs[1][i]);
    }
  }
  
  on_mouseup(MouseEvent event) {
    this.mpos.load([event.y, event.y]);
    this.calc_vel();
    this.end();
  }
  
  on_mousemove(MouseEvent event) {
    this.do_mousemove([event.x, event.y]);
  }
}

class TouchEventManager {
  constructor(EventHandler owner, int delay=100) {
    this.queue = new GArray();
    this.queue_ms = new GArray();
    this.delay = delay;
    this.owner = owner;
  }
  
  get_last(int type) {
    var i = this.queue.length;
    if (i == 0) return undefined;
    i--;
    
    var q = this.queue;
    
    while (i >= 0) {
      var e = q[i];
      if (e.type == type || e.type != MyMouseEvent.MOUSEMOVE)
        break;
      i--;
    }
    
    if (i < 0) i = 0;
    
    return q[i].type == type ? q[i] : undefined;
  }
  
  queue_event(MouseEvent event) {
    var last = this.get_last(event.type);
    
    //merge repeated events, which may
    //contain different touch states
    if (last != undefined && last.type != MyMouseEvent.MOUSEMOVE) {
      var dis, same=true;
      
      for (var k in event.touches) {
        if (!(k in last.touches)) { 
          //same = false;
        }
      }
      
      //only compare same ids
      dis = new Vector2([event.x, event.y]).vectorDistance(new Vector2([last.x, last.y]));
      
      console.log(dis);
      if (same && dis < 50) {
        console.log("destroying duplicate event", last.type, event.x, event.y, event.touches);
        for (var k in event.touches) {
          last.touches[k] = event.touches[k];
        }
        
        return;
      }
    }
    
    this.queue.push(event);
    this.queue_ms.push(time_ms());
  }
  
  cancel(MouseEvent event) {
    var ts = event.touches;
    var dl = new GArray;
    
    for (var e in this.queue) {
      for (var k in ts) {
        if (k in e.touches) {
          delete e.touches;
        }
      }
      
      if (list(e.touches).length == 0) {
        dl.push(e);
      }
    }
    
    for (var e in dl) {
      var i = this.queue.indexOf(e);
      this.queue.remove(e);
      this.queue_ms.pop_i(i);
    }
  }
  
  process() {
    var owner = this.owner;
    
    dl = new GArray();
    var q = this.queue;
    var qm = this.queue_ms;
    var delay = this.delay;
    
    for (var i=0; i<q.length; i++) {
      if (time_ms() - qm[i] > delay) {
        dl.push(q[i]);
      }
    }
    
    //pop events from queue before firing them
    for (var e in dl) {
      var i = q.indexOf(e);
      
      q.remove(e);
      qm.pop_i(i);
    }
    
    //now, fire events
    for (var e in dl) {
      e._good = true;
      
      try {
        if (e.type == MyMouseEvent.MOUSEDOWN)
          owner._on_mousedown(e);
        else if (e.type == MyMouseEvent.MOUSEMOVE)
          owner._on_mousemove(e);
        else if (e.type == MyMouseEvent.MOUSEUP)
          owner._on_mouseup(e);
      } catch (_err) {
        print_stack(_err)
        console.log("Error executing delayed touch event");
      }
    }
  }
  
  reset() {
    this.queue = new GArray();
    this.queue_ms = new GArray();
  }
}

var touch_manager = new TouchEventManager(undefined, 20);
