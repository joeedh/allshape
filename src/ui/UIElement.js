"use strict";

var UIFlags = {
  ENABLED : 1, HIGHLIGHT: 2, 
  FOCUS: 4, GREYED: 8, 
  REDERROR: 16, WARNING: 32, 
  USE_PATH : 64, NO_RECALC: 128,
  FLASH : (16|32), SKIP_DRAW : 256,
  
  //- has_pan flags uiframes with pan callbacks, 
  //- use_pan tells elements to use those callbacks,
  //          e.g. if a tablet user touches a button, then drags,
  //          execute pan
  //- pan_canvas_mat : change canvas global matrix, not frame position
  HAS_PAN : 512, USE_PAN : 1024, PAN_CANVAS_MAT : 2048,
  IS_CANVAS_ROOT : 4096
};

var CanvasFlags = {NOT_ROOT : 1, NO_PROPEGATE : 2}

var _ui_element_id_gen = 1;
function open_mobile_keyboard(e, on_close=function(){}) {
  //stupid android on screen keyboard doesn't interface
  //with javascript very well, ger.
  if (IsMobile)
    call_keyboard(e, on_close);
 //var canvas = document.getElementById("example")
 //canvas.contentEditable = true
 //canvas.focus()
}

function close_mobile_keyboard(e) {
  if (IsMobile)
    end_keyboard(e);
  //var  canvas = document.getElementById("example")
  //canvas.contentEditable = false
  //canvas.focus()
}

/*utility function, expands tested rect when IsMobile is true*/
function inrect_2d_button(Array<float> p, Array<float> pos, Array<float> size) : Boolean {
  static pos2=new Vector2(), size2=new Vector2();
  
  if (IsMobile) {
    pos2.load(pos);
    size2.load(size);
    
    pos2.subScalar(fuzzy_ui_press_hotspot);
    size2.addScalar(fuzzy_ui_press_hotspot*2.0);
    
    return inrect_2d(p, pos2, size2);
  } else {
    return inrect_2d(p, pos, size);
  }
}

class UIElement extends EventHandler {
  constructor(ctx, path=undefined, pos=undefined, size=undefined) {
    EventHandler.call(this)
    
    this.defunct = false;
    
    this._uiel_id = _ui_element_id_gen++;
    
    this.description = "";
    
    this.abspos = [0, 0];
    this._minsize = [0, 0]; //cached variable;
    
    //cached hash string
    this._h12 = undefined : String;
    
    this.state = UIFlags.ENABLED;
    this.packflag = 0
    this.data_path = path;
    this.ctx = ctx
    this.parent = undefined
    
    //timer for error/warning flashes
    this.flash_timer_len = 0.2; //seconds
    this.flash_timer = undefined;
    
    this.pos = [0, 0];
    this.size = [0, 0];
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    
    this.recalc = 0;
    this.recalc_minsize = 0;
    
    if (path != undefined) {
      this.state |= UIFlags.USE_PATH;
    }  
  }
  
  get_keymaps() {
    static empty_arr = [];
    
    return empty_arr;
  }
  
  __hash__() : String {
    if (this._h12 == undefined) {
      var n = this.constructor.name;
      this._h12 = n[2] + n[3] + n[n.length-2] + n[n.length-1] + this._uiel_id.toString();
    }
    
    return this._h12;
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
    l1.length = 0; l2.length = 0;
    
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
    l3.length = 0;
    
    for (var i=0; i<l1.length; i++) {
      var clr = new Vector4(l1[i]);
      clr.interp(l2[i], f);
      l3.push(clr);
    }
    
    console.log(">-->", l1, l2, l3, "<----");
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
  call_menu(menu, off=undefined, min_width=20) { //off, min_width are optional
    if (off == undefined) {
      off = [0, 0];
    }
    
    var frame;
    if (this.parent == undefined) {
      frame = this;
    } else  {
      frame = this.parent;
    }
    
    this.abs_transform(off);
    while (frame.parent != undefined) {
      frame = frame.parent;
    }
    
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
    this.recalc_minsize = 1;
    
    if (this.parent != undefined && !this.is_canvas_root()) {
      this.parent.do_recalc();
    }
  }
  
  //calculates absolute position of pos,
  //relative to this element,
  //*not* this element's parent frame
  abs_transform(Array<float> pos) {
    var e = this;
    
    while (e != undefined) {
      pos[0] += e.pos[0];
      pos[1] += e.pos[1];
      
      if ((e instanceof UIFrame) && (e.state & UIFlags.HAS_PAN)) {
        pos[0] += e.velpan.pan[0];
        pos[1] += e.velpan.pan[1];
      }
      
      e = e.parent;
    }
  }
  
  push_modal(UIElement e=this) {
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
    
    ret = ret || this.state & UIFlags.IS_CANVAS_ROOT;
    ret = ret || this instanceof ScreenArea;
    ret = ret || this instanceof Area;
    ret = ret && this.canvas != undefined;
    ret = ret && !(this.canvas.flag & CanvasFlags.NOT_ROOT);
    
    return ret;
  }
  
  get_hint() : String {
    if (this.description == "" && (this.state & UIFlags.USE_PATH)) {
      var prop = this.get_prop_meta();
      return prop.description != "" ? prop.description : undefined;
    } else {
      return this.description;
    }
  }
  
  start_pan(MouseEvent event=undefined, int button=0) {
    if (!(this.state & UIFlags.HAS_PAN)) {
      if (this.parent == undefined) {
        console.trace();
        console.log("Warning: UIFrame.start_pan: no parent frame with pan support");
      } else {
        if (event != undefined) {
          event.x += this.pos[0];
          event.y += this.pos[1];
        }
        this.parent.start_pan(event, button);
      }
    }
  }
  
  //simple filedata
  get_filedata() : Array<UIFileData> {
    
  }
  
  /*get non-numeric unique hash
    used for saving basic settings, like
    collapsed panels, active tabs, pan positions,
    etc, in files.*/
  get_uhash() : String {
    var s = this.constructor.name;
    
    if (this.data_path != undefined) {
      s += this.data_path;
    }
    
    if (this.parent != undefined) {
      s = this.parent.get_uhash() + s;
    }
    
    return s;
    //return CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(s));
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
  
  /* maintains a cached minimum size, updated when this.recalc is true */
  cached_min_size(UICanvas canvas, Boolean isVertical) {
    if (this.recalc_minsize) {
      this.recalc_minsize = 0;
      var ret = this.get_min_size(canvas, isVertical);
      
      this._minsize[0] = ret[0];
      this._minsize[1] = ret[1];
    }
    
    return this._minsize;
  }
  
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

class UIHoverBox extends UIElement {
  constructor(Context ctx, String text, Boolean is_modal, Array<float> pos, Array<float> size) {
    UIElement.call(this, ctx, undefined, pos, size);
    
    this.is_modal = is_modal;
    this.text = text;
    this.packflag |= PackFlags.NO_REPACK;
  }
  
  get_min_size(UICanvas, Boolean isVertical) {
    return this.size;
  }
  
  on_mousedown(event) {
    if (this.is_modal) {
      //pop modal
      this.pop_modal();
      
      //pass event through
      var mpos = [event.x, event.y];
      
      var p = this, lastp;
      while (p != undefined) {
        lastp = p;
       
        mpos[0] += p.pos[0];
        mpos[1] += p.pos[1];
        
        p = p.parent;
      }
      
      //make sure to remove prior to sending the passthrough event
      this.parent.remove(this);
      this.parent.do_recalc();
      
      console.log(mpos, this.pos, this.parent.parent);
      event.x = mpos[0]; event.y = mpos[1];
      lastp._on_mousedown(event);
    }
  }
  
  on_mousemove(event) {
    if (this.is_modal && !inrect_2d([event.x, event.y], [0, 0], this.size)) {
      this.pop_modal();
      this.parent.remove(this);
      this.parent.do_recalc();
    }
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.begin(this);
    
    canvas.shadow_box([4, -4], this.size);
    
    //hrm, something is wrong with canvas.box1, which is used
    //to draw rounded boxes on desktops.  box2, used on tablets,
    //works correctly.  this size offset shouln't be necassary.
    var size = IsMobile ? this.size : [this.size[0], this.size[1]+2];

    canvas.box2([0, 0], size, uicolors["HoverHint"]);
    canvas.text([4, 7], this.text, uicolors["BoxText"]);
    
    canvas.end(this);
  }
}

class UIHoverHint extends UIElement {
  constructor(Context ctx, String path=undefined, Array<float> pos=undefined, Array<float> size=undefined) {
    global ui_hover_time;
    
    UIElement.call(this, ctx, path, pos, size);
    
    this.start_time = 0;
    this.hover_time = ui_hover_time;
    this.hovering = false;
  }
  
  start_hover() {
    this.start_time = time_ms();
    this.hovering = true;
  }
  
  stop_hover() {
    this.hovering = false;
  }
  
  on_hint(Boolean is_modal=true) : UIElement {
    var hint = this.get_hint();
    
    console.log("hint: ", hint);
    if (!hint) return;
    
    var size = new Vector2(this.ctx.font.calcsize(hint));
    
    size.add([8.0, 12.0]);
    
    var pos = new Vector2([this.pos[0], this.pos[1]-size[1]]);
    var hintbox = new UIHoverBox(this.ctx, hint, is_modal, pos, size);
    
    /*ensure hint is fully within view*/
    var abspos = [0, -size[1]];
    this.abs_transform(abspos);
    
    var screen = g_app_state.screen;
    var abspos2 = [abspos[0], abspos[1]];
    
    //move above element, if necassary
    console.log("hint y", abspos[1], "x", abspos[0]);
    if (abspos[1] < 0) {
      abspos[1] += size[1] + this.size[1];
    }
    
    //clamp to within view, in case above code failed
    abspos[0] = Math.min(Math.max(0, abspos[0]), screen.size[0]-hintbox.size[0]);
    abspos[1] = Math.min(Math.max(0, abspos[1]), screen.size[1]-hintbox.size[1]);
    
    hintbox.pos[0] += abspos[0] - abspos2[0];
    hintbox.pos[1] += abspos[1] - abspos2[1];
    
    this.parent.add_floating(hintbox, is_modal);
    
    return hintbox;
  }
  
  on_active() {
    if (this.hovering) {
      this.start_hover();
    }
  }
  
  on_inactive() {
    this.hovering = false;
  }
  
  on_tick() {
    if (this.hovering && time_ms()-this.start_time >= this.hover_time) {
      this.hovering = false;
      this.on_hint();
    }
  }
}
