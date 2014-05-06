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
  constructor(Context ctx, String name="", is_collapsed=false) {
    RowFrame.call(this, ctx);
    
    this.stored_children = new GArray();
    
    this.default_packflag |= PackFlags.INHERIT_WIDTH;
    
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
    
    var tri = new UICollapseIcon(ctx, is_collapsed, callback1);
    tri.small_icon = true;
    tri.bgmode = "flat";
    this.tri = tri;
    
    var col = this.col();
    
    this.packflag |= PackFlags.NO_AUTO_SPACING;
    
    col.packflag |= PackFlags.ALIGN_LEFT;
    col.default_packflag &= ~PackFlags.INHERIT_WIDTH;
    col.add(tri);
    
    this.title = col.label(name);
    
    this._collapsed = false;
    this.collapsed = is_collapsed;
    this._color = uicolors["CollapsingPanel"];
    
    this.start_child = this.children.length;
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

class UIColorField extends UIElement {
  constructor(ctx) {
    UIElement.call(this, ctx);
    this.h = 0;
    this.s = 0;
    this.v = 0;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    return [150, 175];
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.simple_box([0, 0], this.size);
    
    var cs = [
      [1, 0, 0, 1], 
      [1, 1, 0, 1], 
      [0, 1, 0, 1], 
      [0, 1, 1, 1], 
      [0, 0, 1, 1], 
      [1, 0, 1, 1]
    ];
    
    var cs2 = [];
    for (var i=0; i<cs.length; i++) {
      cs2.push(cs[i]);
      if (i%2 == 0)
        cs2.push(cs[i]);
    }
    //cs = cs2;
    
    var segs = cs.length;
    var wid = Math.ceil((this.size[0]-2) / cs.length);
    static v1=new Vector2(), v2=new Vector2(), v3=new Vector2(), v4=new Vector2();
    
    //hue box
    canvas.box([0, 0], [this.size[0], 26], [0, 0, 0, 1], 0, true);
    var y = 25;
    for (var i=0; i<segs; i++) {
      var i2 = (i+1) % cs.length;
      var c1 = cs[i], c2 = cs[i2], c3 = cs[i2], c4 = cs[i];
      
      v1[0] = i*wid+1; v1[1] = 1;
      v2[0] = i*wid+1; v2[1] = y;
      v3[0] = i*wid+wid+1; v3[1] = y;
      v4[0] = i*wid+wid+1, v4[1] = 1;
      
      canvas.quad(v2, v3, v4, v1, c1, c2, c3, c4);
    }
    
    //saturation/lightness box
    v1[0] = 0; v1[1] = 27;
    v2[0] = 0; v2[1] = this.size[0];
    v3[0] = this.size[0]; v3[1] = this.size[0];
    v4[0] = this.size[0]; v4[1] = 27;
    
    c1 = [0, 0, 0, 1]; c2 = [0, 0, 0, 1];
    c3 = [0.7, 1, 0.5, 1]; c4 = [1, 1, 1, 1];
    
    canvas.quad(v1, v2, v3, v4, c1, c2, c3, c4);
  }
}
