"use strict";

//buttons only take executable (function) paths as arguments
class UIButton extends UIHoverHint {
  constructor(Context ctx, String text, Array<float> pos, 
              Array<float> size, String path=undefined, 
              Function callback=undefined, String hint=undefined) 
  {
    UIHoverHint.call(this, ctx, path, pos, size);
    
    this.clicked = false;
    this.text = text;
    this.hint = hint;
    this.callback = callback;
  }
  
  get_hint() {
    var ctx = this.ctx;
    
    if (this.hint != undefined) {
      return this.hint;
    } else if (this.state & UIFlags.USE_PATH) {
      var op = this.ctx.api.get_op(this.ctx, this.data_path);
      if (op == undefined) return undefined;

      var hotkey = ctx.api.get_op_keyhandler(ctx, this.data_path);
      var ret = op.description == undefined ? "" : op.description;
      
      console.log("hotkey: ", hotkey);
      if (hotkey != undefined) {
        if (ret != "") ret += "\n"
        ret += "      Hotkey: " + hotkey.build_str(true) + "  ";
      }
      
      return ret == "" ? undefined : ret;
    }
  }
  
  on_mousemove(MouseEvent event) {
    if (!this.clicked) {
      this.start_hover();
    }
  }
  
  on_mousedown(MouseEvent event) {
    if (event.button == 0 && !this.clicked) {
      this.push_modal();
      this.stop_hover();
      
      this.clicked = true;
      this.do_recalc();
    }  
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0) {
      this.pop_modal();
      this.clicked = false;
      this.do_recalc();
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        if (this.callback != undefined) {
          this.callback(this);
        }
        
        if (this.state & UIFlags.USE_PATH) {
          this.ctx.api.call_op(this.ctx, this.data_path);
        }
      }
    }  
  }

  build_draw(UICanvas canvas) {
    canvas.begin(this);

    if (this.clicked) 
      canvas.invbox([0, 0], this.size);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.hlightbox([0, 0], this.size)
    else 
      canvas.box([0, 0], this.size);
    
    var tsize = canvas.textsize(this.text);
    
    if (tsize[0] < this.size[0])
      canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.25], this.text, uicolors["BoxText"]);
    else
      canvas.text([5, (this.size[1]-tsize[1])*0.25], this.text, uicolors["BoxText"]);
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text)[0]+12, 26]
  }
}

class UIButtonIcon extends UIButton {
  constructor(Context ctx, String text, int icon, Array<float> pos, 
              Array<float> size, String path=undefined, 
              Function callback=undefined, String hint=undefined) 
  {
    UIButton.call(this, ctx, text, pos, size, path, callback, hint);
    this.icon = icon;
    this.pad = 2;
    this._min_size = [0, 0];
  }
  
  get_min_size(UICanvas canvas, Boolean isvertical) {
    var ret = [0, 0]; // this._min_size;
    var pad = this.pad;
    
    ret[0] = canvas.iconsheet.cellsize[0]+pad*2.0;
    ret[1] = canvas.iconsheet.cellsize[1]+pad*2.0;
    
    return ret;
  }
  
  build_draw(UICanvas canvas) {
    static pos = [0, 0];
    static size = [0, 0];
    
    canvas.begin(this);

    /*can't print debug info in a draw loop,
      unfortunately, so just return
     */
    if (this.icon == -1) {
      return;
    }
    
    var pad = this.pad;
    
    var isize = canvas.iconsheet.cellsize;
    pos[0] = Math.abs(isize[0] - this.size[0] + pad*2.0)*0.5;
    pos[1] = 0;
    
    size[0] = isize[0]+pad*2.0;
    size[1] = isize[1]+pad*2.0;
    
    if (this.clicked) 
      canvas.invbox(pos, size);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.hlightbox(pos, size)
    else 
      canvas.box(pos, size);
    
    pos[0] += pad;
    pos[1] += pad;
    canvas.icon(this.icon, pos, 0.75);
    canvas.end(this);
  }
}

class UIMenuButton extends UIHoverHint {
  constructor(ctx, menu, pos, size, path, description="") {//menu can be undefined, if path is defined
    UIHoverHint.call(this, ctx, path);
    
    this.menu = undefined : UIMenu;
    
    this.description = "";
    this.ctx = ctx;
    this.clicked = false;
    this.text = ""
    this.val = 0;
    this.pos = pos
    this.size = size
    this.callback = undefined;
    this.prop = undefined : ToolProperty;
    
    if (this.state & UIFlags.USE_PATH) {
      this.build_menu();
    }
  }
  
  on_tick() {
    UIHoverHint.prototype.on_tick.call(this);
    
    if (this.state & UIFlags.USE_PATH) {
      var val = this.get_prop_data();
      
      if (val == undefined)
        val = "(undefined)"
      
      if (val != this.val) {
        this.val = val;
        
        if (this.prop.ui_value_names[val] != undefined)
          this.text = this.prop.ui_value_names[val];
        else
          this.text = val.toString();
        
        this.do_recalc();
      }
    }
    
    if (this.menu.closed) {
      if (this.clicked) {
        this.do_recalc();
      }
      this.clicked = false;
    }
  }

  build_menu() {
    var this2 = this;
    
    function callback(entry, id) {
      this2.val = id;
      this2.text = this2.prop.ui_value_names[this2.val];
      this2.clicked = false;
      this2.do_recalc();
      this2.set_prop_data(this2.val);
    }
    
    var menu = new UIMenu("", callback);
    this.prop = this.ctx.api.get_prop_meta(this.ctx, this.data_path);
    
    for (var k in this.prop.ui_value_names) {
      var hotkey;
      if (this.prop.hotkey_ref != undefined) {
        hotkey = this.prop.hotkey_ref.build_str();
      } else {
        hotkey = "";
      }
      
      menu.add_item(this.prop.ui_value_names[k], hotkey, k);
    }
    
    this.menu = menu;
  }

  on_mousedown(MouseEvent event) {
    if (event.button == 0 && this.clicked == false) {
      this.stop_hover();
      this.call_menu(this.menu, [0, Math.floor(this.size[1]-3)], this.size[0]);
      this.clicked = true;
      this.do_recalc();
    }  
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0 && this.clicked == true) {
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        console.log("clicked")
        
        if (this.callback != undefined) {
          this.callback(this);
        }
      }
    }  
  }
  
  on_mousemove(MouseEvent event) {
    if (!this.clicked) {
      this.start_hover();
    }
  }
  
  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    if (this.clicked) 
      canvas.invbox([0, 0], this.size);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.hlightbox([0, 0], this.size)
    else 
      canvas.box([0, 0], this.size);
    
    var siz = this.size[1]/2.5
    var p = 3;

    var tsize = canvas.textsize(this.text);
    var x = Math.floor((this.size[0]-tsize[0]-siz-p*3)/2)
    var y = Math.floor((this.size[1]-tsize[1])/4);
    
    if (!this.clicked)
      canvas.text([x, y], this.text, uicolors["BoxText"]);
    
    var clr = uicolors["Arrow"]
    
    var x = this.size[0]-siz-p*3, y =this.size[1]-siz*1.5-p;
    
    canvas.line([x-p*2, 2, 0], [x-p*2, this.size[1]-1, 0], clr, clr, 2.0);
    canvas.tri([x, y, 0], [x+siz, y, 0], [x+siz/2, y+siz, 0], clr);

    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    if (this.menu != undefined) {
      this.menu.packmenu(canvas);
      
      var size = [canvas.textsize(this.text+"     ")[0], 26];
      
      for (var c in this.menu.children) {
        var size2 = c.get_min_size(canvas, isvertical);
        size[0] = Math.max(size[0], size2[0])
        size[1] = Math.max(size[1], size2[1])
      }
      
      return [size[0]+canvas.textsize("     ")[0]+20, 26];
    } else {
      return [canvas.textsize(this.text+"     ")[0]+20, 26]
    }
  }
}

class UICheckBox extends UIHoverHint {
  constructor(ctx, text, pos, size, path) {
    UIHoverHint.call(this, ctx, path);
    
    this.ctx = ctx;
    this.set = false;
    this.mdown = false;
    this.text = text
    this.pos = pos
    this.size = size
    this.callback = undefined;
    
    this.prop = undefined : ToolProperty;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = this.get_prop_meta();
    }
  }

  on_tick() {
    UIHoverHint.prototype.on_tick.call(this);

    if (!this.mdown && (this.state & UIFlags.USE_PATH)) {
      var val = this.get_prop_data();
      
      if (val != this.set) {
        this.set = val;
        this.do_recalc();
      }
    }
  }
  
  on_mousemove(MouseEvent event) {
    if (!this.mdown) {
      this.start_hover();
    }
  }
  
  on_mousedown(MouseEvent event) {
    if (event.button == 0 && !this.mdown) {
      this.push_modal()
      
      this.stop_hover();
      
      this.mdown = true;
      this.set ^= true;
      
      if (this.callback != undefined)
        this.callback(this, this.set);
      
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.set);
      }
      
      this.do_recalc();
    }  
  }

  on_mouseup(MouseEvent event) {
    if (this.mdown) {
      this.pop_modal();
      this.mdown = false;
      
      if (this.callback != undefined) {
        this.callback(this, this.set);
      }
    }  
  }

  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    var csize = [14, 14]
    function draw_check() {
      var h1 = 7;
      var h2 = -3
      var ox = 2;
      var r = 20
      
      var v1 = [0+ox, h1, 0]
      var v2 = [10+ox, 5+h2, 0]
      var v3 = [10+ox, 10+h2, 0]
      var v4 = [0+ox, h1+5, 0]
      
      canvas.quad_aa(v1, v2, v3, v4, uicolors["Check"])
      
      var v1 = [5+ox, h1+2, 0]
      var v2 = [10+ox, h1, 0]
      var v3 = [15+ox, h1+15, 0]
      var v4 = [10+ox, h1+15, 0]
      
      canvas.quad_aa(v1, v2, v3, v4, uicolors["Check"])
    }
    
    if (this.state & UIFlags.HIGHLIGHT) {
      canvas.simple_box([2, 0], [this.size[0], csize[1]])
      
      var mul = this.set ? 1.0 : 0.3;
      canvas.hlightbox([0, 0], csize, mul, 2)
      if (this.set) draw_check();
    } else if(this.set) {
      canvas.invbox([2, 0], csize, undefined, 2);
      draw_check();
    } else {
      canvas.box([2, 0], csize, undefined, 2);
    }
    
    var tsize = canvas.textsize(this.text);
    canvas.text([csize[0]+5, (this.size[1]-tsize[1])*0.25], this.text);

    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text)[0]+15, 26]
  }
}

class UINumBox extends UIHoverHint {
  constructor(ctx, text, range, val, pos, size, path) { //path is optional
    UIHoverHint.call(this, ctx, path);
    
    this.unit = undefined;
    this.clicked = false;
    this.range = range
    this.val = val
    this.start_val
    this.ctx = ctx;
    this.set = true;
    this.text = text
    this.is_int = false;
    this.pos = pos
    this.size = size
    this.callback = undefined;
    this.start_mpos = [0, 0];
    
    if (this.state & UIFlags.USE_PATH) {
      var prop = this.get_prop_meta(ctx);
      
      if (prop.type == PropTypes.INT) {
        this.is_int = true;
      }
    }
  }

  set_val(Number val) {
    this.val = val;
    this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1]);
    
    if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.val);
    }
    
    this.do_recalc();
  }

  on_mousedown(MouseEvent event) {
    var numbox = this;
    
    function unit_error(numbox) {
      console.log(["numbox error", numbox]);
      numbox.flash(UIFlags.REDERROR);
      numbox.do_recalc();
    }
    
    //callback for ending text edit swap;
    function on_end_edit(tbox, cancelled) {
      this.parent.replace(textbox, numbox);
      numbox.set_val(Unit.parse(tbox.text, numbox.val, unit_error, numbox, numbox.unit));
    }
    
    if (event.button == 0 && !this.clicked && !event.shiftKey) {
      this.push_modal()
      
      this.start_mpos = [event.x, event.y]
      this.start_val = this.val
      this.stop_hover();
      this.clicked = true;
      this.do_recalc();
    } else if (event.shiftKey) {
      //swap out with text button
      var unit = this.unit;
      
      var valstr = Unit.gen_string(this.val, unit);      
      var textbox = new UITextBox(this.ctx, valstr, this.pos, this.size);
      
      textbox.packflag |= PackFlags.NO_REPACK;
      this.parent.replace(this, textbox);

      textbox.begin_edit(event);
      textbox.set_cursor();
      
      textbox.on_end_edit = on_end_edit;
    }
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0) {
      this.pop_modal();
      
      this.clicked = false;
      if (Math.abs(this.start_mpos[0]-event.x) <= 1 && Math.abs(this.start_mpos[1]-event.y) <= 1) { 
        var df = Math.min((this.range[1] - this.range[0])*0.1, 1.0);
        if (event.x < this.size[0]/2.0) {
          df = -df;
        }
        
        this.val += df;
        this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1])
        this.do_recalc()
        
        if (this.state & UIFlags.USE_PATH) {
          this.set_prop_data(this.val);
        }
      }
      
      if (this.callback != undefined) {
        this.callback(this, this.val);
      }
      
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.val);
      }
      
      this.do_recalc();
    }  
  }

  on_tick() {
    UIHoverHint.prototype.on_tick.call(this);
    
    if (this.state & UIFlags.USE_PATH) {
      var val = this.get_prop_data();
      
      if (val != this.val) {
        this.val = val;
        
        if (this.callback != undefined) {
          this.callback(this, this.val);
        }
        
        this.do_recalc();
      }
    }
  }

  on_mousemove(MouseEvent event) {
    var mpos = objcache.getarr(event.x, event.y);
    
    if (this.clicked) {
      var df = (mpos[0] - this.start_mpos[0]) / 300.0
      
      var sign = df < 0.0 ? -1.0 : 1.0;
      
      if (!this.is_int) {
        df = df*df;
        df *= sign;
      }
      
      df *= this.range[1] - this.range[0]
    
      this.val = this.start_val + df
      this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1])
      if (this.is_int)
        this.val = Math.floor(this.val);
        
      this.do_recalc()
      
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.val);
      }
    } else {
      this.start_hover();
    }
  }

  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    var clr = uicolors["Box"];
    
    if (this.clicked) 
      canvas.invbox([0, 0], this.size);
    else if (!(this.state & UIFlags.FLASH) && (this.state & UIFlags.HIGHLIGHT))
      canvas.hlightbox([0, 0], this.size, this.do_flash_color())
    else 
      canvas.box([0, 0], this.size, this.do_flash_color(clr));
    
    var unit = this.unit;    
    var valstr = this.val.toString(); //XXX Unit.gen_string(this.val, unit);
    
    var str = this.text + " " + valstr
    var pad = 15
    while (str.length > 1 && canvas.textsize(str)[0] > this.size[0]-pad*2) {
      str = str.slice(0, str.length-1);
    }
    
    var tsize = canvas.textsize(str)
    
    pad = (this.size[0] - tsize[0])*0.5
    canvas.text([pad, 0.25*(this.size[1]-tsize[1])+1], str, uicolors["BoxText"]);
    
    var siz = this.size[1]/2.0
    var x = 4, y= (this.size[1]-siz)/2;
    var clr = uicolors["Arrow"]
    
    canvas.tri([x+siz/2, y, 0], [x+siz/2, y+siz, 0], [x, y+siz/2, 0], clr);    
    x = this.size[0]-siz*0.5-3; y= (this.size[1]-siz)/2;
    
    canvas.tri([x-siz/2, y, 0], [x-siz/2, y+siz, 0], [x, y+siz/2, 0], clr);    
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text)[0]+70, 26]
  }
}

class UILabel extends UIElement {
  constructor(ctx, text, pos, size, path) {
    UIElement.call(this, ctx, path);

    this.prop = undefined;
    this.val = text;
    this.text = text

    if (this.state & UIFlags.USE_PATH) {
      this.prop = ctx.api.get_prop_meta(ctx, this.data_path);
      this.val = this.prop.data;
      this.text = this.prop.uiname + ": "
    }

    this.clicked = false;
    this.pos = pos
    this.size = size
    this.callback = undefined;
  }

  set_text(text) {
    if (this.text != text)
      this.do_recalc();
    
    this.text = text;
  }

  on_tick() {
    if (this.state & UIFlags.USE_PATH) {
      var val = this.get_prop_data();
      if (val != this.val) {
        this.val = val;
        this.text = this.prop.uiname + ": " + val.toString();
        this.do_recalc();
      }
    }
  }
  on_mousedown(MouseEvent event) {
    if (event.button == 0) {
      this.clicked = true;
    }  
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0) {
      this.clicked = false;
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        console.log("clicked")
        if (this.callback != undefined) {
          this.callback(this);
        }
      }
    }  
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    //canvas.push_scissor([0,0], this.size);
    canvas.begin(this);
    
    var tsize = canvas.textsize(this.text);
    canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.25], this.text, undefined);
    
    canvas.end(this);
    //canvas.pop_scissor();
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text)[0]+4, 26]
  }
}

/*menu labels use hidden elements to pass signals between each other,
  e.g. that a user is hovering over a label, and the menu should switch
  to that one.*/
class _HiddenMenuElement extends UIElement {
  constructor(Context ctx, UIMenuLabel src_menu_label, UIMenuLabel dst_menu_label) {
    UIElement.call(this, ctx);
    
    this.src_menu_label = src_menu_label;
    this.dst_menu_label = dst_menu_label
  }

  on_mousemove(MouseEvent event) {
    if (DEBUG.ui_menus)
      console.log("In _HiddenMenuElement.on_mousemove()");
    
    this.src_menu_label.menu.end_menu()
    this.src_menu_label.clicked = false;
    this.src_menu_label.state &= ~UIFlags.HIGHLIGHT;
    this.src_menu_label.do_recalc();
    
    this.dst_menu_label.clicked = true;
    this.dst_menu_label.spawn_menu();
  }

  build_draw(UICanvas canvas, Boolean isvertical) {
    //canvas.begin(this);
    //canvas.simple_box([0,0], this.size);
    //canvas.end(this);
  }
}

class UIMenuLabel extends UIElement {
  constructor(ctx, text, menu, gen_menu_func, pos, size) {
    UIElement.call(this, ctx);
    
    if (pos == undefined) pos = [0, 0];
    if (size == undefined) size = [0, 0];
    
    this.prop = undefined;
    this.val = text;
    this.text = text
    
    this.clicked = false;
    this.pos = pos
    this.size = size
    this.callback = undefined;
    this.gen_menu = gen_menu_func;
    this.menu_callback = undefined;
    this.callback_override = undefined;
    this.off = [0, 0];
  }

  on_tick() {
    if (this.clicked && this.menu != undefined && this.menu.closed) {
      this.clicked = false;
      this.do_recalc();
    }
  }

  /*menu labels use hidden elements to pass signals between each other,
    e.g. that a user is hovering over a label, and the menu should switch
    to that one.*/
  add_hidden_elements(menu) {
    var es = new GArray();
    for (var c in this.parent.children) {
      if (c == this || c.constructor.name != UIMenuLabel.name) continue;
      
      var e = new _HiddenMenuElement(this.ctx, this, c);
      e.size = c.size;
      
      e.pos = [c.pos[0]-this.pos[0]-this.off[0], c.pos[1]-this.pos[1]-this.off[1]];
      
      es.push(e);
    }
    
    /*remove any existing hidden elements*/
    var del = new GArray();
    for (var c in menu.children) {
      if (c.constructor.name == _HiddenMenuElement.name)
        del.push(c);
    }
    
    for (var c in del) {
      menu.children.remove(c);
    }
    
    for (var c in es) {
      menu.add(c);
    }
  }

  spawn_menu(Array<int> mpos) {
    this.clicked = true;
    this.do_recalc();
    
    if (this.gen_menu != undefined) {
      this.menu = this.gen_menu(this.ctx, this);
    }
    
    var menu = this.menu;
    var off = [0,0];
    menu.packmenu(this.canvas);
    
    var absco = this.get_abs_pos();
    var scrsize = this.ctx.screen.size;
    
    if (scrsize[1] - absco[1] - this.size[1] < menu.size[1]) {
      off = this.off = [0, - menu.size[1]];
    } else {
      off = this.off = [0, this.size[1]];
    }
    
    var this2 = this;
    
    if (this.menu.callback != this.callback_override) {
      this.menu_callback = menu.callback;
      
      this.callback_override = menu.callback = function(entry, id) {
        this2.clicked = false;
        
        if (this2.menu_callback != undefined) {
          this2.menu_callback(entry, id);
        }
        
        this2.do_recalc();
        this2.state &= ~UIFlags.HIGHLIGHT;
      }
    }
    
    this.add_hidden_elements(menu);
    this.call_menu(menu, off);
  }

  on_mousedown(MouseEvent event) {
    if (event.button == 0 && this.clicked == false) {
      this.spawn_menu([event.x, event.y]);
    }
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0 && this.clicked == false) {
      this.clicked = false;
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        console.log("clicked")
        if (this.callback != undefined) {
          this.callback(this);
        }
      }
    }  
  }

  build_draw(UICanvas canvas) {
    if (this.canvas == undefined)
      this.canvas = canvas;
    
    canvas.begin(this);
    //canvas.push_scissor([0,0], this.size);
    
    if (this.clicked)
      canvas.box([0,-2], [this.size[0], this.size[1]+4], uicolors["MenuLabelInv"], 10);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.box([0,-2], [this.size[0], this.size[1]+4], uicolors["MenuLabel"], 10);
    //else
    //  canvas.box_outline([0,0], this.size, uicolors["MenuLabel"], 10);
    
    var tsize = canvas.textsize(this.text);
    canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.25], this.text);
    
    //canvas.pop_scissor();  
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text)[0]+4, 26]
  }
}

class UITextBox extends UIElement {
  constructor(ctx, text, pos, size, path) {
    UIElement.call(this, ctx, path);
    
    this.on_end_edit = undefined;
    
    if (pos != undefined)
      this.pos = pos
    if (size != undefined)
      this.size = size;
    
    this.prop = undefined;
    this.text = text
    this.start_text = text;
    this.min_width = 110;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = ctx.api.get_prop_meta(ctx, this.data_path);
      this.val = this.prop.data;
      this.text = this.prop.uiname + ": "
    }
    
    this.selecting = false;
    this.cur_sel_i = 0; //index in this.sel that corresponds to the cursor
    this.sel = [0, 0];
    this.selcursor = 0; //selcursor is the current location of the mouse within text
    this.cursor = 0;
    this.last_cursor = 0;
    this.clicked = false;
    this.callback = undefined;
    this.text_offx = 13;
    this.text_min_offx = 13;
    this.replace_mode = false;
    
    this.gmap = undefined : Array<int>; //x positions of each character in .text
    
    this.cancel_on_escape = false;
    this.mpos = [0,0];
    this.last_mpos = [0,0];
  }

  set_text(text) {
    if (this.text != text)
      this.do_recalc();
      
    this.text = text;
  }

  on_tick() {
    if (!this.clicked && (this.state & UIFlags.USE_PATH)) {
      var val = this.get_prop_data();
      if (val != this.text) {
        this.text = val;
        this.do_recalc();
      }
    }
    
    if (this.clicked && this.cursor != this.last_cursor) {
      this.do_recalc();
      this.last_cursor = this.cursor;
    }
  }

  on_mousedown(MouseEvent event) {
    this.mpos = [event.x, event.y]
    
    if (event.button == 0) {
      if (this.clicked == false) {
        this.begin_edit(event);
        this.selecting = true;
      } else if (!this.selecting && !inrect_2d([event.x, event.y], [0, 0], this.size)) {
        this.end_edit(false);
      } else {
        this.selecting = true;
        this.cursor = this.selcursor;
        this.set_cursor();
        if (!event.shiftKey) {
          this.sel = [this.cursor, this.cursor];
        } else {
          this.handle_selecting();
        }
      }
    }
  }

  on_mouseup(MouseEvent event) {
    this.mpos = [event.x, event.y]
    
    if (this.clicked && this.selecting) {
      this.selecting = false;
      this.do_recalc();
    }
  }

  handle_selecting() {
    var cur = this.selcursor;
    
    if (cur < this.sel[0] && this.cur_sel_i == 1) {
      this.sel[1] = this.sel[0];
      this.cur_sel_i = 0;
    } else if (cur > this.sel[1] && this.cur_sel_i == 0) {
      this.cur_sel_i = 1;
    }
    
    this.sel[this.cur_sel_i] = cur;
    this.cursor = cur;
    this.set_cursor();
  }


  on_mousemove(MouseEvent event) {
    this.mpos = [event.x, event.y]
    if (!this.clicked) return;
    
    if (inrect_2d(this.last_mpos, [-10, -10], [this.size[0]+20, this.size[1]+20]) !=
        inrect_2d(this.mpos, [-10, -10], [this.size[0]+20, this.size[1]+20])) 
    {
      this.do_recalc();
    }
    
    if (inrect_2d([event.x, event.y], [-10, -10], [this.size[0]+20, this.size[1]+20])) {
      this.find_selcursor(event);
    }
    
    if (this.selecting) {
      this.handle_selecting();
    }
    
    this.last_mpos = [this.mpos[0], this.mpos[1]];
  }

  begin_edit(event) {
    this.do_recalc();
    
    this.push_modal();
    this.start_text = new String(this.text);
    this.gen_glyphmap();
    this.do_recalc();
    
    if (event != undefined) {
      this.find_selcursor(event);
    } else {
      this.find_selcursor(new MyMouseEvent(x, y, 0, MyMouseEvent.MOUSEMOVE));
    }
    
    this.cursor = this.selcursor;
    this.sel = [0, this.text.length];
    this.clicked = true;
    
    open_android_keyboard();
  }

  end_edit(cancel) { //cancel is optional, defaults to false
    if (cancel == undefined) cancel = false;
    
    if (cancel) {
      this.text = this.start_text;
    }
    
    this.clicked = false;
    this.pop_modal();
    this.do_recalc();
    this.selecting = false;
    this.state &= ~UIFlags.HIGHLIGHT;
    this.text_offx = this.text_min_offx;
    
    if (this.callback) {
      this.callback(this, this.text);
    }
    
    if  (this.state & UIFlags.USE_PATH) {
      this.set_prop_data(this.text);
    }
    
    close_android_keyboard()
    
    if (this.on_end_edit)
      this.on_end_edit(this, cancel);
  }

  set_cursor() {
    this.cursor = Math.max(Math.min(this.cursor, this.text.length), 0);
    
    if (this.clicked && this.cursor != this.last_cursor) {
      this.do_recalc();
      this.last_cursor = this.cursor;
      
      var pad1 = this.text_min_offx;
      var pad2 = 28;
      
      if (this.gmap[this.cursor] > this.size[0]-pad2) {
        this.text_offx += this.size[0]-pad2-this.gmap[this.cursor];
        this.gen_glyphmap();
      } else if (this.gmap[this.cursor] < pad1) {
        this.text_offx += pad1-this.gmap[this.cursor];
        this.gen_glyphmap();
      }
    }
  }

  insert(text) {
    if (this.has_sel()) {
      var text2 = this.text.slice(0, this.sel[0]) + text + this.text.slice(this.sel[1], this.text.length);
      this.replace_text(text2);
      this.cursor = this.sel[0] + text.length;
      this.sel = [0,0];
    } else {
      var text2 = this.text.slice(0, this.cursor) + text + this.text.slice(this.cursor, this.text.length);
      this.replace_text(text2);
      
      this.cursor += text.length;
    }
  }

  delcmd(dir) {
    if (this.has_sel()) {
      this.insert("");
    } else {
      if (this.cursor+dir >= 0 && this.cursor+dir <= this.text.length) {
        var text2;
        
        if (dir > 0) {
          text2 = this.text.slice(0, this.cursor) + this.text.slice(this.cursor+1, this.text.length);
        } else {
          text2 = this.text.slice(0, this.cursor-1) + this.text.slice(this.cursor, this.text.length);
          this.cursor -= 1;
          this.set_cursor();
        }
        this.replace_text(text2);
      }
    }
    
    this.set_cursor();
  }

  find_next_textbox() {
    var p = this.parent;
    
    while (p != undefined) {
      //break at appropriate window boundary
      if (p instanceof Area || p instanceof Dialog) {
        break;
      }
      
      p = p.parent;
    }
    
    var root = p;
    
    p = this.parent;
    var i = this.parent.children.indexOf(this);
    var c = this;
    
    function find_textbox(e, exclude) {
      if (e instanceof UITextBox && e != exclude) 
        return e;
      
      if (e instanceof UIFrame) {
        for (var c in e.children) {
          var ret = find_textbox(c, exclude);
          if (ret != undefined)
            return ret;
        }
      }
    }
    
    var next;
    do {
      next = find_textbox(c, this);
      if (next)
        break;
      
      p = p.parent;
      c = c.parent;
      i = p.children.indexOf(c);
    } while (p != root);
    if (!next) {
      next = find_textbox(root, this);
    }
    
    if (!next) {
      console.log("Error in find_next_textbox()");
      this.end_edit();
      return;
    }
    
    if (next == this) {
      this.end_edit();
      return;
    }
    
    this.end_edit();
    next.begin_edit();
  }

  on_charcode(KeyboardEvent event) {
    this.insert(event["char"]);
  }

  on_keydown(KeyboardEvent event) {
    var this2 = this;
    
    function start_sel() {
      if (!this2.has_sel()) {
        this2.sel[0] = this2.sel[1] = this2.cursor;
      }
    }
    
    if (event.keyCode == charmap["Enter"]) {
      this.end_edit();
    } else if (event.keyCode == charmap["Escape"]) {
      this.end_edit(this.cancel_on_escape);
    } else if (event.keyCode == charmap["Left"]) {
      start_sel();
      
      this.cursor -= 1;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Right"]) {
      start_sel();
      
      this.cursor += 1;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Insert"]) {
      this.replace_mode ^= true;
      this.do_recalc();
    } else if (event.keyCode == charmap["Delete"]) {
      this.delcmd(1);
    } else if (event.keyCode == charmap["Backspace"]) {
      this.delcmd(-1);
    } else if (event.keyCode == charmap["A"] && event.ctrlKey && !event.shiftKey && !event.altKey) {
      this.sel = [0, this.text.length];
      this.do_recalc();
    } else if (event.keyCode == charmap["Home"]) {
      start_sel();
      
      this.cursor = 0;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["End"]) {
      start_sel();
      
      this.cursor = this.text.length;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Tab"]) {
      this.find_next_textbox();
    }
  }

  find_selcursor(MouseEvent event) {
    var gmap = this.gmap;
    var selcursor=0;
    
    if (event.x <= gmap[0]) {
      selcursor = 0;
    } else if (event.x >= gmap[gmap.length-1]) {
      selcursor = this.text.length;
    } else {
      for (var i=0; i<gmap.length-1; i++) {
        if (event.x >= gmap[i] && event.x <= gmap[i+1]) {
          selcursor = i;
          break;
        }
      }
    }
    
    if (selcursor != this.selcursor) {
      this.selcursor = selcursor;
      this.do_recalc();
    }
  }

  replace_text(text) {
    this.text = text;
    
    this.gen_glyphmap();
    this.set_cursor();
    
    //clamp selcursor
    this.selcursor = Math.min(Math.max(0, this.selcursor), this.text.length);
    this.do_recalc();
  }
  has_sel() {
    return this.sel[1]-this.sel[0] > 0;
  }

  gen_glyphmap() {
    this.gmap = [];
    var gmap = this.gmap;
    
    function calc_callback(Array<float> vrect, Array<float> trect) {
      gmap.push(Math.min(vrect[0], trect[0]));
    }
    
    this.ctx.font.calc_string(this.text, calc_callback);
    gmap.push(this.ctx.font.calcsize(this.text)[0]);
    
    this.text_offx = Math.min(this.text_offx, gmap[gmap.length-1]*default_ui_font_size);
    
    for (var i=0; i<gmap.length; i++) {
      gmap[i] = Math.floor(gmap[i]*default_ui_font_size) + this.text_offx;
    }
  }

  build_draw(UICanvas canvas) {
    var tsize = canvas.textsize(this.text);
    
    canvas.begin(this);

    if (this.clicked) 
      canvas.invbox([0, 0], this.size, uicolors["TextBoxInv"], 16);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.box([0, 0], this.size, uicolors["TextBoxHighlight"], 16)
    else {
      canvas.box([0, 0], this.size, uicolors["TextBox"], 16);
    }
    
    canvas.push_scissor([0, 0], this.size);
    
    if (this.clicked && this.has_sel()) {
      var x1 = this.gmap[this.sel[0]];
      var x2 = this.gmap[this.sel[1]];
      
      canvas.simple_box([x1, 0], [x2-x1, this.size[1]], uicolors["TextSelect"], 100);
    }
    
    //canvas.push_scissor([this.text_min_offx-4, 0], [this.size[0]-4, this.size[1]]);
    canvas.text([this.text_offx, (this.size[1]-tsize[1])*0.25], this.text, uicolors["BoxText"]);
    //canvas.pop_scissor();
    
    if (this.clicked) {
      if (inrect_2d(this.mpos, [-10,-10], [this.size[0]+20, this.size[1]+20])) {
        if (!this.has_sel() || (this.selcursor < this.sel[0] || this.selcursor > this.sel[1])) {
          var x = this.gmap[this.selcursor];
          if (x == undefined)
            x = 0;
          
          canvas.line([x, 0], [x, this.size[1]], uicolors["HighlightCursor"], undefined, 2.0);
        }
      }
      
      if (!this.has_sel()) {
        var x = this.gmap[this.cursor];
        var w = this.replace_mode ? 4.0 : 2.0;
        
        if (x != undefined &&  w != undefined) {
          canvas.line([x, 0], [x, this.size[1]], uicolors["TextEditCursor"], undefined, w);
        }
      }
    }
    
    canvas.pop_scissor();
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [this.min_width, 26]
  }
}

class UIListBox extends ColumnFrame {
  constructor(ctx, pos, size, callback) {
    ColumnFrame.call(this, ctx);
    
    if (size != undefined && size[0]+size[1] != 0.0)
      this.size = size;
    else
      this.size = [500, 350]; //default size;
    
    if (pos != undefined)
      this.pos = pos;
    
    this.active_entry = undefined : UIListEntry;
    this.callback = callback;
    this.mdown = false;
    this.listbox = new RowFrame(ctx);
    this.add(this.listbox, PackFlags.INHERIT_WIDTH|PackFlags.ALIGN_LEFT);
    
    this.vscroll = new UIVScroll(ctx, [0, 0])
    this.vscroll.packflag |= PackFlags.INHERIT_HEIGHT;
    
    this.listbox.static_size = [this.size[0]-26, this.size[1]]
    this.scrollx = 0;
    this.scrolly = 0;
    
    var this2=this;
    this.vscroll.callback = function(vscroll, value) {
      this2._vscroll_callback(vscroll, value);
    }
    this.vscroll.step = 26;
    this.add(this.vscroll);
    
    this.packflag |= PackFlags.ALIGN_LEFT;
    this.packflag &= ~PackFlags.ALIGN_CENTER;
  }

   _vscroll_callback(vscroll, value)
  {
    this.scrolly = value;
    this.listbox.do_full_recalc();
    this.do_full_recalc();
  }

  on_mouseup(event) {
    prior(UIListBox, this).on_mouseup.call(this, event);
    
    if (this.listbox.active != undefined && (this.listbox.active instanceof UIListEntry)) {
      if (this.active_entry != undefined && this.active_entry != this.listbox.active) {
        this.active_entry.do_recalc();
      }
      
      this.active_entry = this.listbox.active;
      this.active_entry.do_recalc();
      if (this.callback != undefined) {
        this.callback(this, this.active_entry.text, this.active_entry.id);
      }
    }
  }
  
  jump(int off) {
    if (this.active_entry == undefined) return;
    
    var i = this.listbox.children.indexOf(this.active_entry) + off;
    i = Math.min(Math.max(0, i), this.listbox.children.length-1);
    
    this.active_entry.do_recalc();
    this.active_entry = this.listbox.children[i];
    this.active_entry.do_recalc();
    
    if (this.callback != undefined) {
      this.callback(this, this.active_entry.text, this.active_entry.id);
    }
  }
  
  on_keydown(event) {
    if (event.keyCode == charmap["Up"]) {
      this.jump(-1);
    } else if (event.keyCode == charmap["Down"]) {
      this.jump(1);
    }
  }
  
  add_item(str, id) {
    var entry = new UIListEntry(this.ctx, str, id);
    
    entry.packflag |= PackFlags.ALIGN_LEFT|PackFlags.INHERIT_WIDTH;

    this.listbox.add(entry, PackFlags.ALIGN_LEFT);
    this.do_recalc();
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.push_scissor([0,0], this.size);
    canvas.begin(this);

    canvas.simple_box([0,0], this.size, uicolors["ListBoxBG"]);
    prior(UIListBox, this).build_draw.call(this, canvas, isVertical);
    
    canvas.end(this);
    canvas.pop_scissor();
  }

  reset()
  {
    this.listbox.children = new GArray();
    this.do_recalc();
  }

  pack(UICanvas canvas, Boolean is_vertical)
  {
    this.listbox.min_size = [this.size[0]-26, this.size[1]]
    
    prior(UIListBox, this).pack.call(this, canvas, is_vertical);
    
    this.vscroll.pos[1] = 0;
    this.vscroll.size[1] = this.listbox.static_size[1];
    
    /*enforce correct size on this.listbox (a RowFrame)*/
    var area = this.listbox.get_min_size(canvas, is_vertical);
    this.listbox.size[0] = area[0];
    this.listbox.size[1] = area[1];
    
    if (area[1] > this.size[1])
      this.vscroll.set_range([0, area[1]-this.size[1]]);
    else
      this.vscroll.set_range([0, 50]);
    
    this.listbox.pos[1] = this.size[1]-this.listbox.size[1];
    
    this.listbox.pos[0] += this.scrollx;
    this.listbox.pos[1] += this.scrolly;
  }

  get_min_size(UICanvas canvas, Boolean isVertical) {

    if (this.size != undefined && this.size[0]+this.size[1] != 0.0) {
      return this.size;
    } else {
      return [500, 300];
    }
  }
}

class UIListEntry extends UILabel {
  constructor(ctx, text, id) {
    UILabel.call(this, ctx, text);
    
    this.id = id;
  }
    
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.begin(this);
    
    if (this == this.parent.parent.active_entry) {
      canvas.simple_box([0,0], this.size);
      canvas.simple_box([0,0], this.size);
    } else if (this.state & UIFlags.HIGHLIGHT) {
      canvas.simple_box([0,0], this.size);
    }
    
    var tsize = canvas.textsize(this.text);
    canvas.text([7, (this.size[1]-tsize[1])*0.25], this.text, uicolors["ListBoxText"]);
    
    canvas.end(this);
  }
}

class ScrollButton extends UIElement {
  constructor(ctx, pos, size, callback) {
    UIElement.call(this, ctx);
    
    this.clicked = false;
    this.pos = pos
    this.size = size
    this.callback = callback;
  }

  on_mousedown(MouseEvent event) {
    if (event.button == 0 && !this.clicked) {
      this.push_modal()
      
      this.clicked = true;
      this.do_recalc();
      
      if (inrect_2d([event.x, event.y], [0,0], this.size)) {
        if (this.callback != undefined) {
          this.callback(this, [event.x, event.y]);
        }
      }
    }  
  }

  on_mouseup(MouseEvent event) {
    if (event.button == 0) {
      this.pop_modal();
      this.clicked = false;
      this.do_recalc();    
    }
  }

  build_draw(UICanvas canvas) {
    if (this.clicked) 
      canvas.invbox([0, 0], this.size);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.hlightbox([0, 0], this.size)
    else 
      canvas.box([0, 0], this.size);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [26, 26]
  }
}

class UIVScroll extends UIFrame {
  constructor(ctx, range, pos=[0,0], size=[0,0], callback=undefined) {
    UIFrame.call(this, ctx);
    
    this.packflag |= PackFlags.INHERIT_HEIGHT;
    this.packflag |= PackFlags.ALIGN_RIGHT;
    
    this.step = undefined : float;
    this.clicked = false;
    this.range = range
    this.pos = pos
    this.size = size
    this.val = 0;
    this.callback = callback;
    
    this.but1 = new ScrollButton(ctx, [0,0], [0,0])
    this.add(this.but1);
    
    this.but2 = new ScrollButton(ctx, [0,0], [0,0]);
    this.add(this.but2);
    
    this.bar = new ScrollButton(ctx, [0,0], [0,0]);
    this.barsize = 32;
    this.add(this.bar);
    
    this.dragging = false;
    this.last_mpos = [0,0];
    
    var this2=this;
    this.bar.callback = function(button, mpos) {
      this2.do_drag([mpos[0]+button.pos[0], mpos[1]+button.pos[1]+this2.pos[1]+this2.parent.pos[1]]);
    }
    
    this.but1.callback = function(button, mpos) {
      this2.increment(1);
    }
    
    this.but2.callback = function(button, mpos) {
      this2.increment(-1);
    }
  }

  set_range(range) {
    if (this.range == undefined || this.range[0] != range[0] || this.range[1] != range[1])
      this.do_recalc();
      
    this.range = range;
    
    this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1]);
    this.pack_bar();
  }

  do_drag(mpos) {
    this.last_mpos = mpos;
    this.dragging = true;
    
    this.bar.pop_modal();
    this.parent.push_modal(this);
    
    console.log("dragging");
  }

  increment(sign) {
    var step = this.step;
    if (step == undefined)
      step = (this.range[1]-this.range[0])/10.0;
    
    this.val += step*sign;
    this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1]);
      
    if (this.callback != undefined) {
      this.callback(this, this.val);
    }
  }

  set_value(val) {
    val = Math.min(Math.max(val, this.range[0]), this.range[1]);
    this.val = val;
  }

  pack_bar() {
    var bar = this.bar;
    var range = this.range;
      
    var size1 = this.barsize;
    
    size1 = this.size[1]-this.but1.size[1]-this.but2.size[1]-size1;
    
    bar.size[0] = this.size[0];
    bar.size[1] = this.barsize;
    
    var fac = size1/(this.range[1]-this.range[0]);
    bar.pos[1] = this.but1.size[1]+(this.range[1]-this.val-this.range[0]*2)*fac;
  }

  on_mousedown(MouseEvent event) {
    if (!this.dragging) {
      prior(UIVScroll, this).on_mousedown.call(this, event);
    }
  }

  on_mouseup(MouseEvent event) {
    if (this.dragging) {
      this.dragging = false;
      this.parent.pop_modal();
      this.bar.clicked = false;
      this.bar.do_recalc();
    } else {
      prior(UIVScroll, this).on_mouseup.call(this, event);
    }
  }

  on_mousemove(MouseEvent event) {
    if (this.dragging) {
      var mpos = [event.x, event.y];
      
      var y = mpos[1]-this.last_mpos[1];
      
      var fac = (this.range[1]-this.range[0])
      fac = fac / (this.size[1]-this.but1.size[1]-this.but2.size[1]-this.barsize);
      
      this.val -= fac*y + this.range[0];
      this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1]);
      
      if (this.callback != undefined) {
        this.callback(this, this.val);
      }
      
      this.last_mpos = mpos;
      
      this.bar.do_recalc();
      this.do_recalc();
    } else {
      prior(UIVScroll, this).on_mousemove.call(this, event);
    }
  }

  pack(UICanvas canvas, Boolean isVertical)
  {
    this.but1.size = [this.size[0], this.size[0]];
    this.but2.pos = [0, this.size[1]-this.size[0]+1];
    this.but2.size = [this.size[0], this.size[0]];

    this.pack_bar();
  }

  build_draw(UICanvas canvas, Boolean isVertical) 
  {
    canvas.begin(this);
    
    if (this.range[1]-this.range[0] == 0.0) {
      canvas.simple_box([0,0], this.size);
      return;
    }
    
    this.canvas = canvas;
    
    canvas.simple_box([0,0], this.size);
    prior(UIVScroll, this).build_draw.call(this, canvas, isVertical);

    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [26, 26*3]
  }
}
