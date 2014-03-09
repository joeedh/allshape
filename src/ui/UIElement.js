"use strict";

var UIFlags = {
  ENABLED : 1, HIGHLIGHT: 2, 
  FOCUS: 4, GREYED: 8, 
  REDERROR: 16, WARNING: 32, 
  USE_PATH : 64, NO_RECALC: 128,
  FLASH : (16|32)
};

var PackFlags = {
  INHERIT_HEIGHT : 1, INHERIT_WIDTH: 2, 
  ALIGN_RIGHT : 4, ALIGN_LEFT: 8, 
  ALIGN_CENTER: 16, ALIGN_BOTTOM : 32, 
  IGNORE_LIMIT : 64, NO_REPACK : 128,
  UI_DATAPATH_IGNORE : 256
}
var CanvasFlags = {NOT_ROOT : 1, NO_PROPEGATE : 2}

var _ui_element_id_gen = 1;
var default_ui_font_size = 0.7;
function open_android_keyboard() {
   var canvas = document.getElementById("example")
   canvas.contentEditable = true
   canvas.focus()
}

function close_android_keyboard() {
    var  canvas = document.getElementById("example")
    canvas.contentEditable = false
    canvas.focus()
    
}

class UIElement extends EventHandler {
  constructor(ctx, path, pos, size) {
    EventHandler.call(this)
    
    this._uiel_id = _ui_element_id_gen++;
    
    this.state = UIFlags.ENABLED;
    this.packflag = 0
    this.data_path = path;
    this.ctx = ctx
    this.parent = undefined
    
    //timer for error/warning flashes
    this.flash_timer_len = 0.2; //seconds
    this.flash_timer = undefined;
    
    if (pos == undefined)
      pos = [0, 0];
    
    if (size == undefined)
      size = [0, 0];
    
    this.size = size
    this.pos = pos
    
    this.recalc = 0;
    
    if (path != undefined) {
      this.state |= UIFlags.USE_PATH;
    }  
  }

  __hash__() : String {
    var n = this.constructor.name;
    return n[2] + n[3] + n[n.length-2] + n[n.length-1] + this._uiel_id.toString();
  }

  set_context(ctx) {
    this.ctx = ctx;
  }

  inc_flash_timer(color) {
    if (this.status_timer == undefined) return false;
      
    if (this.status_timer.ready()) {
      this.status_timer = undefined;
      this.state &= ~UIFlags.FLASH;
      return false;
    }
    
    return true;
  }

  do_flash_color(color) {
    if (!this.inc_flash_timer()) return undefined;
    
    var color2;
    
    if (this.state & UIFlags.REDERROR)
      color2 = uicolors["ErrorBox"];
    else if (this.state & UIFlags.WARNING)
      color2 = uicolors["WarningBox"];
    
    if (color == undefined)
      color = color2;
    if (color2 == undefined)
      return undefined;
    
    var f = this.status_timer.normval;
    
    if (f < 0.5) f *= 2.0;
    else (f = 1.0 - f) *2.0;
    
    //console.log("f: " + f.toString());
    
    var alen = color.length;
    
    var l1 = objcache.array(alen), l2 = objcache.array(alen);
    if (typeof(color[0]) == "number") {
      l1.push(color);
    } else {
      for (var i=0; i<color.length; i++) {
        l1.push(color[i]);
      }
    }
    
    if (typeof(color2[0]) == "number") {
      l2.push(color2);
    } else {
      for (var i=0; i<color2.length; i++) {
        l2.push(color2[i]);
      }
    }
    
    while (l1.length < l2.length) {
      l1.push(l1[l1.length-1]);
    }
    while (l2.length < l1.length) {
      l2.push(l2[l2.length-1]);
    }
    
    var l3 = objcache.array(l1.length);
    for (var i=0; i<l1.length; i++) {
      var clr = new Vector4(l1[i]);
      clr.interp(l2[i], f);
      l3.push(clr);
    }
    
    if (l3.length == 1) 
      return l3[0];
    else
      return l3;
  }

  flash(status) {
    this.status_timer = new Timer(this.flash_timer_len*1000.0);
    this.state |= status;
  }

  get_abs_pos() {
    static pos = [0, 0];
    
    pos[0] = this.pos[0];
    pos[1] = this.pos[1];
    
    var p = this.parent;
    while (p != undefined) {
      pos[0] += p.pos[0]
      pos[1] += p.pos[1]
      p = p.parent;
    }
    
    return pos;
  }

  //calls a menu at an element's screen position, offset by off
  call_menu(menu, off, min_width) { //off, min_width are optional
    if (off == undefined) {
      off = [0, 0];
    }
    
    off[0] += this.pos[0];
    off[1] += this.pos[1];
    
    var frame;
    if (this.parent == undefined) {
      frame = this;
    } else  {
      frame = this.parent;
    }
    
    while (frame.parent != undefined) {
      off[0] += frame.pos[0];
      off[1] += frame.pos[1];
      frame = frame.parent;
    }
    off[0] += frame.pos[0];
    off[1] += frame.pos[1];
    
    ui_call_menu(menu, frame, off, false, min_width);
  }

  set_prop_data(data) {
    var ctx = this.ctx;
    
    ctx.api.set_prop(ctx, this.data_path, data);
  }

  get_prop_data() {
    var ctx = this.ctx;
    
    return ctx.api.get_prop(ctx, this.data_path);
  }

  get_prop_meta() {
    var ctx = this.ctx;
    
    return ctx.api.get_prop_meta(ctx, this.data_path);
  }

  do_recalc() {
    this.recalc = 1;
    
    if (this.parent != undefined && !this.is_canvas_root()) {
      this.parent.do_recalc();
    }
  }

  push_modal(e) {
    if (e == undefined)
      e = this;
    
    EventHandler.prototype.push_modal.call(this, e);
    
    var p = this.parent
    while (p != undefined) {
      p.push_modal(e);
      
      e = p;
      p = p.parent;
    }
  }

  pop_modal() {
    EventHandler.prototype.pop_modal.call(this);
    
    var p = this.parent
    while (p != undefined) {
      p.pop_modal();
      
      p = p.parent;
    }
  }

  get_canvas() {
    var frame = this;
    while (frame.parent != undefined && frame.canvas == undefined) {
      frame = frame.parent;
    }
    
    return frame.canvas;
  }

  is_canvas_root() : Boolean {
    var ret = this.parent == undefined || this.parent.canvas == undefined || (this.parent.canvas != this.canvas);
    
    ret = ret || this instanceof ScreenArea;
    ret = ret || this instanceof Area;
    ret = ret && this.canvas != undefined;
    ret = ret && !(this.canvas.flag & CanvasFlags.NOT_ROOT);
    
    return ret;
  }

  on_tick() { }
  on_keydown(KeyboardEvent event) { }
  on_keyup(KeyboardEvent event) { }
  on_mousemove(MouseEvent event) { }
  on_mousedown(MouseEvent event) { }
  on_mousewheel(MouseEvent event) { }
  on_mouseup(MouseEvent event) { }
  on_contextchange(Object event) { }
  update_data(Context ctx) { }
  get_min_size(UICanvas canvas, Boolean isvertical) 
  {
    static ret = [1, 1];
    
    return ret;
  }
  build_draw(UICanvas canvas, Boolean isvertical) { }
  on_active() {}
  on_inactive() {}
  pack(UICanvas canvas, Boolean isvertical) {}
  gen_tooltip() : String {}
  on_add(parent) {}
  on_remove(parent) {}
}
