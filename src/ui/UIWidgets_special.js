"use strict";

class UICollapseIcon extends UIButtonIcon {
  constructor(ctx, is_collapsed=false, user_callback = undefined) {
    UIButtonIcon.call(this, ctx, "+", Icons.UI_COLLAPSE);
    
    this._collapsed = 0;
    this.collapsed = is_collapsed;
    
    /*okay.  this bit of idiotic code is used
      to implement callback chaining, which I
      need to implement properly
     */
    var this2 = this;
    this._wrapped_callback = function() {
      console.log("triangle");
      this2.collapsed ^= true;
    
      if (this2._callback != undefined)
        this2._callback(this2, this2.collapsed);
    };
    this._callback = user_callback;
  }
  
  //this is especially evil, returns the callback wrapper, not
  //the user callback itself
  get callback() : Function {
    return this._wrapped_callback;
  }
  
  set callback(Function callback) : Function {
    this._callback = callback;
  }
  
  get collapsed() : Boolean {
    return this._collapsed;
  }
  
  set collapsed(Boolean val) {
    if (!!val != !!this._collapsed) {
      this.icon = val ? Icons.UI_EXPAND : Icons.UI_COLLAPSE;
      this._collapsed = val;
      this.do_recalc();
    }
  }
}

class UIPanel extends RowFrame {
  constructor(Context ctx, String name="", String id=name, is_collapsed=false) {
    RowFrame.call(this, ctx);
    
    this.permid = id;
    this.stored_children = new GArray();
    
    this.packflag |= PackFlags.ALIGN_LEFT;
    this.default_packflag |= PackFlags.INHERIT_WIDTH;
    this.state |= UIFlags.NO_FRAME_CACHE;
    
    //store whether the user manually changed
    //the collapsed state
    this.user_opened = false;
    this.user_closed = false;
    
    /*collapser triangle*/
    var this2 = this;
    function callback1(iconbut, do_collapse) {
      console.log("panel collapse callback");
      
      this2.collapsed ^= true;
      this2.user_opened = !this2.collapsed;
      this2.user_closed = this2.collapsed;
    }
    
    this.pad[1] = 1;
    
    var tri = new UICollapseIcon(ctx, is_collapsed, callback1);
    tri.small_icon = true;
    tri.bgmode = "flat";
    this.tri = tri;
    
    var col = this.col();
    
    this.packflag |= PackFlags.NO_AUTO_SPACING;
    
    col.packflag |= PackFlags.ALIGN_LEFT|PackFlags.NO_AUTO_SPACING;
    col.default_packflag &= ~PackFlags.INHERIT_WIDTH;
    if (IsMobile)
      col.label(" ");
    col.add(tri);
    
    this.text = name;
    this.title = col.label(name);
    this.title.color = uicolors["PanelText"];
    
    this._collapsed = false;
    this.collapsed = is_collapsed;
    this._color = uicolors["CollapsingPanel"];
    
    this.start_child = this.children.length;
  }
  
  on_saved_uidata(Function descend) {
    prior(UIPanel, this).on_saved_uidata.call(this, descend);
    
    for (var c in this.stored_children) {
      descend(c);
    }
  }
  
  on_load_uidata(Function visit) {
    prior(UIPanel, this).on_load_uidata.call(this, visit);
    
    for (var c in this.stored_children) {
      visit(c);
    }
  }
  
  get_uhash() : String {
    return prior(UIPanel, this).get_uhash.call(this) + this.permid;
  }
  
  get_filedata() : ObjectMap {
    return {collapsed : this._collapsed, user_opened : this.user_opened};
  }
  
  load_filedata(ObjectMap obj) {
    console.log(obj, typeof(obj), obj.constructor.name, obj.collapsed, "<--------------");
    
    this.collapsed = obj.collapsed;
    this.user_opened = obj.user_opened;
  }
  
  get collapsed() : Boolean {
    return this._collapsed;
  }
  
  get color() : Array<float> {
    return this._color;
  }
  
  set color(Array<float> color) : Array<float> {
    for (var i=0; i<4; i++) {
      if (color[i] != this._color[i]) {
        this.do_recalc();
        break;
      }
    }
    
    this._color = color;
  }
  
  set collapsed(Boolean is_collapsed) {
    if (!!is_collapsed == this._collapsed)
      return;
    
    if (is_collapsed != this._collapsed && this.parent != undefined)
      this.parent.do_full_recalc(); //reflow
    
    this.tri.collapsed = is_collapsed;
    this._collapsed = is_collapsed;
    
    //cleared manually opened/closed flags;
    //the triangle button's callback will
    //set them again if necassary.
    this.user_opened = false;
    this.user_closed = false;
    
    if (!is_collapsed) {
      if (this.stored_children.length > 0) {
        for (var c in this.stored_children) {
          this.add(c);
        }
      
        this.stored_children = new GArray();
      }
    } else if (this.children.length > this.start_child) {
      this.stored_children = this.children.slice(this.start_child, this.children.length);
      this.children = this.children.slice(0, this.start_child);
      this.do_recalc();
    }
  }
  
  add(UIElement child, int packflag) {
    if (this._collapsed) {
      child.parent = this;
      child.packflag |= packflag|this.default_packflag;
      this.stored_children.push(child);
    } else {
      prior(UIPanel, this).add.call(this, child);
    }
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    this.title.color = uicolors["PanelText"];
    
    canvas.simple_box([0, 0], this.size, this.color);
    
    prior(UIPanel, this).build_draw.call(this, canvas, isVertical);
  }
}

function get_editor_list() : GArray<Function> {
  static ret = undefined;
  
  if (ret == undefined) {
    ret = new GArray();
    for (var cls in defined_classes) {
      if (subclass_of(cls, Area))
        ret.push(cls);
    }
  }
  
  return ret;
}

function gen_editor_switcher(Context ctx, Area parent) {
  var editors = get_editor_list();
  
  var menu = new UIMenu("", undefined);
  
  var i = 0;
  for (var e in editors) {
    menu.add_item(e.uiname, "", e);
    i++;
  }
  
  //stupid way to get reference to e (UIMenuButton) into callback
  var obj = {};
  function callback(entry, cls) {
    console.log("editor switcher callback", cls.name);
    
    parent.parent.switch_editor(cls);
    
    //reset label, this is necassary
    obj.e.text = parent.constructor.uiname;
  }
  
  menu.callback = callback;
  
  var e = new UIMenuButton(ctx, menu, [0,0], [1,1], undefined, "Switch editors");
  obj.e = e;
  e.text = parent.constructor.uiname;
  
  return e;
}

var _hue_field = [
  [1, 0, 0, 1], 
  [1, 1, 0, 1], 
  [0, 1, 0, 1], 
  [0, 1, 1, 1], 
  [0, 0, 1, 1], 
  [1, 0, 1, 1]
];

class UIColorField extends UIElement {
  constructor(ctx, callback=undefined) {
    UIElement.call(this, ctx);
    this.h = 0.0;
    this.s = 0.0;
    this.v = 1.0;
    this.huehgt = 25;
    
    this.mode = undefined; //"h" or "sv"
    this.clicked = false;
    
    this.callback = callback;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    return [150, 165];
  }
  
  do_mouse(MouseEvent event) {
    static pos = [0, 0], size=[0,0];
    static mpos = [0, 0];
    mpos[0] = event.x; mpos[1] = event.y;
    
    if (this.mode == "h") {
      this.h = (mpos[0]-7) / (this.size[0]-12-2);
      this.h = Math.min(Math.max(this.h, 0), 1.0); //clamp
      
      this.do_recalc();
      
      if (this.callback != undefined) {
        this.callback(this, this.h, this.s, this.v);
      }
    } else if (this.mode == "sv") {
      var v = mpos[0]/this.size[0];
      var s = (mpos[1]-this.huehgt+2)/(this.size[1]-this.huehgt);
      
      this.v = Math.min(Math.max(v, 0), 1.0); //clamp
      this.s = Math.min(Math.max(s, 0), 1.0); //clamp
      this.do_recalc();

      if (this.callback != undefined) {
        this.callback(this, this.h, this.s, this.v);
      }
    }
  }
  
  on_mousedown(MouseEvent event) {
    if (this.clicked == false) {
      this.clicked = true;
      this.push_modal();
      
      var pos = [1, 1];
      var size = [this.size[0]-2, this.huehgt];
      var mpos = [event.x, event.y];
      
      if (inrect_2d(mpos, pos, size)) {
        this.mode = "h"
      } else {
        this.mode = "sv";
      }
      
      this.do_mouse(event);
    }
  }
  
  on_mousemove(MouseEvent event) {
    if (this.clicked) {
      this.do_mouse(event);
    }
  }
  
  on_mouseup(MouseEvent event) {
    if (this.clicked) {
      this.clicked = false;
      this.pop_modal();
    }
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    global _hue_field;
    canvas.simple_box([0, 0], this.size);
    
    var cs = _hue_field;
    var segs = cs.length;
    static sz = [12, 12];
    var wid = Math.ceil((this.size[0]-2-sz[0]) / cs.length);
    static v1=new Vector2(), v2=new Vector2(), v3=new Vector2(), v4=new Vector2();
    var h = this.h, s = this.s, v = this.v;
    
    var halfx = Math.floor(sz[0]*0.5);
    
    //hue box
    canvas.box([0, 0], [this.size[0], 26], [0, 0, 0, 1], 0, true);
    var y = this.huehgt;
    var c1, c2, c3, c4;
    
    //canvas.box1([1, 1], [halfx, y], cs[0]);
    //we "shrink in" the range a little, so the user doesn't wander
    //outside the element bounds (it shouldn't matter in production
    //situations, but it is annoying otherwise when testing with a console sidebar
    
    canvas.quad([1, 1], [1, y], [halfx+1, y], [halfx+1, 1], cs[0]);
    for (var i=0; i<segs; i++) {
      var i2 = (i+1) % cs.length;
      var c1 = cs[i], c2 = cs[i2], c3 = cs[i2], c4 = cs[i];
      
      v1[0] = i*wid+1+halfx; v1[1] = 1;
      v2[0] = i*wid+1+halfx; v2[1] = y;
      v3[0] = i*wid+wid+1+halfx; v3[1] = y;
      v4[0] = i*wid+wid+1+halfx, v4[1] = 1;
      
      canvas.quad(v2, v3, v4, v1, c1, c2, c3, c4);
    }
    canvas.quad(v4, v3, [this.size[0]-1, y], [this.size[0]-1, 1], cs[0]);
    
    //saturation/lightness box
    v1[0] = 0; v1[1] = y+2;
    v2[0] = 0; v2[1] = this.size[1];
    v3[0] = this.size[0]; v3[1] = this.size[1];
    v4[0] = this.size[0]; v4[1] = 27;
    
    static clr = [0, 0, 0, 1];
    
    var h1 = Math.floor(h*cs.length) % cs.length;
    var h2 = (h1+1) % cs.length;
    var t = h*cs.length - h1;
    //console.log("-", h, h1, h2, t);
    
    if (t < 0 || t > 1) t = 0;
    for (var i=0; i<3; i++) {
      clr[i] = cs[h1][i] + (cs[h2][i] - cs[h1][i])*t;
    }
    
    c1 = [0, 0, 0, 1]; c2 = [0, 0, 0, 1];
    c3 = clr; c4 = [1, 1, 1, 1];
    
    canvas.quad(v1, v2, v3, v4, c1, c2, c3, c4);
    
    //hue cursor
    static pos1 = [0, 0];
    
    pos1[0] = Math.floor(1+h*(this.size[0]-2-sz[0]));
    pos1[1] = Math.floor(y*0.5-sz[1]*0.5);
    
    //console.log("h", Math.floor(h*this.size[0]));
    canvas.box(pos1, sz);
    
    //s/v cursor
    pos1[0] = Math.floor((this.size[0]-sz[0])*v);
    pos1[1] = Math.floor((this.size[1]-y-4)*s + y+2 - sz[1]*0.5);
    
    canvas.box(pos1, sz);
  }
}

class UIColorBox extends UIElement {
  constructor(ctx, color=undefined) {
    UIElement.call(this, ctx);
    
    if (color == undefined)
      this.color = [0, 0, 0, 1];
    else
      this.color = [color[0], color[1], color[2], color[3]];
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    return [40, 40];
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    //console.log("c", this.color);
    static white = [1.0, 1.0, 1.0, 1.0];
    static grey  = [0.3, 0.3, 0.3, 1.0];
    
    var tot = 3;
    var wid = [this.size[0]/tot, this.size[1]/tot];
    var pos = [0, 0];
    
    for (var i=0; i<tot; i++) {
      pos[1] = 0;
      for (var j=0; j<tot; j++) {
        var k = (i+j)%2;
        
        canvas.box2(pos, wid, k ? white : grey);
        pos[1] += wid[1];
      }
      pos[0] += wid[0];
    }
    
    canvas.box2([0, 0], this.size, this.color);
  }
}

class UIColorPicker extends RowFrame {
  constructor(Context ctx, Array<float> color=undefined) {
    RowFrame.call(this, ctx);
    
    if (color == undefined) {
      this._color = [1, 0, 0, 1];
    } else {
      this._color = [color[0], color[1], color[2], color[3]];
    }
    
    var this2 = this;
    function hsv_callback(field, h, s, v) {
      this2.hsv_callback(field, h, s, v);
    }
    
    this.field = new UIColorField(ctx, hsv_callback);
    this.preview = new UIColorBox(ctx, this._color)
    
    var col = this.col();
    
    this.preview.packflag |= PackFlags.INHERIT_HEIGHT;
    col.add(this.field);
    col.add(this.preview, PackFlags.INHERIT_HEIGHT);
    
    var r = new UINumBox(ctx, "R", [0, 1]);
    var g = new UINumBox(ctx, "G", [0, 1]);
    var b = new UINumBox(ctx, "B", [0, 1]);
    var a = new UINumBox(ctx, "A", [0, 1]);
    
    r.slide_power = g.slide_power = b.slide_power = a.slide_power = 2.0;
    r.slide_mul = g.slide_mul = b.slide_mul = a.slide_mul = 4.0;
    
    var row = this.row(undefined, PackFlags.INHERIT_WIDTH, PackFlags.INHERIT_WIDTH);
    row.add(r);
    row.add(g);
    row.add(b);
    
    var this2 = this;
    function slider_callback(axis) {
      function callback(slider, val) {
        this2._color[axis] = val;
        this2.update_widgets();
      }
      
      return callback;
    }
    r.callback = slider_callback(0);
    g.callback = slider_callback(1);
    b.callback = slider_callback(2);
    a.callback = slider_callback(3);

    this.r = r; this.g = g; this.b = b; this.a = a;
    this.add(a, PackFlags.INHERIT_WIDTH);
    
    this.update_widgets();
  }
  
  on_tick() {
    if (this.state & UIFlags.USE_PATH) {
      var color = this.get_prop_data();
      
      var same = true;
      for (var i=0; i<4; i++) {
        if (color[i] != this._color[i]) {
          same = false;
        }
        
        this._color[i] = color[i];
      }
      
      //avoid conflicts with widgets being manipulated
      if (!same && this.modalhandler == undefined) {
        this.update_widgets();
      }
    }
  }
  
  get color() : Array<float> {
    return this._color;
  }
  
  set color(Array<float> color) {
    var do_update = false;
    
    for (var i=0; i<4; i++) {
      if (color[i] != undefined && this._color[i] != color[i]) {
        this._color[i] = color[i];
        do_update = true;
      }
    }
    
    if (do_update)
      this.update_widgets();
    this.do_path();
  }
  
  do_path() {
    if (this.state & UIFlags.USE_PATH) {
      var clr = this.get_prop_data();
      
      for (var i=0; i<4; i++) {
        if (clr[i] != this._color[i]) {
          this.set_prop_data(this._color);
          break;
        }
      }
    }
  }
  
  update_widgets() {
    static hsva = [0, 0, 0, 0];
    
    rgba_to_hsva(this._color, hsva);
    
    this.field.h = hsva[0]*0.9999; this.field.s = hsva[1]; this.field.v = hsva[2];
    this.field.do_recalc();
    
    this.preview.color = this._color;
    this.preview.do_recalc();
    
    this.r.set_val(this._color[0]);
    this.g.set_val(this._color[1]);
    this.b.set_val(this._color[2]);
    this.a.set_val(this._color[3]);
    
    this.do_path();
  }
  
  hsv_callback(field, h, s, v) {
    static hsva = [0, 0, 0, 0];
    
    hsva[0] = h*0.9999; hsva[1] = s; hsva[2] = v; hsva[3] = this._color[3];
    hsva_to_rgba(hsva, this._color);
    
    this.update_widgets();
  }
}

class UIBoxWColor extends ColumnFrame {
  constructor(ctx, path) {
    ColumnFrame.call(this, ctx, path);
    //this.data_path = path;
    //this.state |= UIFlags.USE_PATH;
    
    this.prop("color");
    var row = this.prop("weights");
    
    row.packflag |= PackFlags.NO_AUTO_SPACING|PackFlags.ALIGN_BOTTOM;
    var i = 1;
    for (var c in row.children) {
      if (c instanceof UINumBox) {
        c.slide_power = 2.0;
        c.slide_mul = 4.0;
        c.unit = undefined;
        c.text = ""+i;
        i++;
      }
    }
    row.children.reverse();
    row.pad[0] = 20;
  }
}

class UIBoxColor extends RowFrame {
}

class UIProgressBar extends UIElement {
  constructor(Context ctx, float value=0.0, float min=0.0, float max=1.0, int min_wid=200, int min_hgt=25) {
    UIElement.call(this, ctx);
    
    this.value = value;
    this.min = min;
    this.max = max;
    this.min_wid = min_wid;
    this.min_hgt = min_hgt;
    this.size[1] = min_hgt;
    this.size[0] = min_wid;
    this.last_value = this.value;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) : Array<float> {
    return [this.min_wid, this.min_hgt];
  }
  
  //we recalc draw buffers in on_tick, to avoid excessive updates per second
  on_tick() {
    prior(UIProgressBar, this).on_tick.call(this);
    
    if (this.last_value != this.value) {
      this.do_recalc();
      this.last_value = this.value;
    }
  }
  
  set_value(float value) {
    this.last_value = this.value;
    this.value = value;
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    static zero = [0, 0];
    static one = [1, 1];
    static size2 = [0, 0];
    
    canvas.begin(this);
    var perc = (this.value / (this.max-this.min));
    
    canvas.box(zero, this.size, uicolors["ProgressBarBG"]);
    
    if (perc > 0.0) {
      perc = Math.min(Math.max(0.0, perc), 1.0);
      
      size2[1] = this.size[1]-2;
      size2[0] = Math.floor(this.size[0]*perc)-2;
      canvas.box(one, size2, uicolors["ProgressBar"]);
    }
    
    canvas.end(this);
  }
}