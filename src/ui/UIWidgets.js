"use strict";

#include "src/core/utildefine.js"

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
    this._do_err_on_draw = false;
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
    if (DEBUG.ui_except_handling) {
      this._do_err_on_draw = true;
    }
    
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
      
      console.log("button mouseup: ", event.x, event.y, this.size[0], this.size[1]);
      
      if (inrect_2d_button([event.x, event.y], [0, 0], this.size)) {
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

    if (this._do_err_on_draw) {
      throw new Error("test exception");
    }
    
    if (this.clicked) 
      canvas.invbox([0, 0], this.size);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.hlightbox([0, 0], this.size)
    else 
      canvas.box([0, 0], this.size);
    
    var tsize = canvas.textsize(this.text);
    
    if (tsize[0] < this.size[0])
      canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.5], this.text, uicolors["BoxText"]);
    else
      canvas.text([5, (this.size[1]-tsize[1])*0.5], this.text, uicolors["BoxText"]);
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return CACHEARR2(canvas.textsize(this.text)[0]+12, 26)
  }
}

class UIButtonIcon extends UIButton {
  constructor(Context ctx, String text, int icon, Array<float> pos, 
              Array<float> size, String path=undefined, 
              Function callback=undefined, String hint=undefined,
              Boolean use_small_icon=false) 
  {
    UIButton.call(this, ctx, text, pos, size, path, callback, hint);
    this.icon = icon;
    this.small_icon = use_small_icon;
    this.bgmode = "button";
    this.pad = 2;
    this._min_size = [0, 0];
  }
  
  get_min_size(UICanvas canvas, Boolean isvertical) {
    var ret = this._min_size;
    var pad = this.pad;
    
    if (this.small_icon)
      pad += 4;
    
    var iconsheet = this.small_icon ? canvas.iconsheet16 : canvas.iconsheet;
    ret[0] = iconsheet.cellsize[0]+pad*2.0;
    ret[1] = iconsheet.cellsize[1]+pad*2.0;
    
    return ret;
  }
  
  get_hint() {
    var ret = prior(UIButtonIcon, this).get_hint.call(this);
    
    if (this.text)
      ret = this.text + "\n\n" + ret
    
    return ret;
  }
  
  build_draw(UICanvas canvas) {
    if (this._do_err_on_draw) {
      throw new Error("test exception");
    }
    
    static pos = [0, 0];
    static size = [0, 0];
    
    canvas.begin(this);

    /*can't print debug info in a draw loop,
      unfortunately, so just return
     */
    if (this.icon == -1) {
      if (this.clicked) 
        canvas.invbox(this.pos, this.size);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.hlightbox(this.pos, this.size)
      else 
        canvas.box(this.pos, this.size);
      
      return;
    }
    
    var pad = this.pad;
    
    var isize = this.small_icon ? canvas.iconsheet16.cellsize : canvas.iconsheet.cellsize;
    pos[0] = Math.abs(isize[0] - this.size[0] + pad*2.0)*0.5;
    pos[1] = 0;
    
    var size = this.size;
    //size[0] = isize[0]+pad*2.0;
    //size[1] = isize[1]+pad*2.0;
    
    if (this.bgmode == "button") {
      if (this.clicked) 
        canvas.invbox(pos, size);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.hlightbox(pos, size)
      else 
        canvas.box(pos, size);
    } else if (this.bgmode == "flat") {
      static high_clr = [0.9, 0.9, 0.9, 0.2];
      static inset_clr = [0.3, 0.3, 0.3, 0.2];
      
      if (this.clicked) 
        canvas.box(pos, size, inset_clr);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.box(pos, size, high_clr);
    }
    
    pos[0] += (size[0]-isize[0])*0.5;
    pos[1] += (size[1]-isize[1])*0.5;
    
    if (this.small_icon)    
      canvas.icon(this.icon, pos, 0.75, true);
    else
      canvas.icon(this.icon, pos, 0.75, false);
    
    canvas.end(this);
  }
}

class UIMenuButton extends UIHoverHint {
  constructor(ctx, menu, pos, size, path, description="") {//menu can be undefined, if path is defined
    UIHoverHint.call(this, ctx, path);
    
    this.menu = menu : UIMenu;
    
    this.description = "";
    this.ctx = ctx;
    this.clicked = false;
    this.text = ""
    this.val = 0;
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    
    this.callback = undefined;
    this.prop = undefined : ToolProperty;
    
    if (this.state & UIFlags.USE_PATH) {
      this.build_menu();
    } else {
      var subcallback = menu.callback;
      var this2 = this;
      
      function callback(entry, id) {
        this2.text = entry.label;
        this2.do_recalc();
        
        subcallback(entry, id);
      }
      
      menu.callback = callback;
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
    
    if (this.menu != undefined && this.menu.closed) {
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
      if (inrect_2d_button([event.x, event.y], [0,0], this.size)) {
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
      
      var size = CACHEARR2(canvas.textsize(this.text+"     ")[0], 26);
      
      for (var c in this.menu.children) {
        var size2 = c.get_min_size(canvas, isvertical);
        size[0] = Math.max(size[0], size2[0])
        size[1] = Math.max(size[1], size2[1])
      }
      
      return CACHEARR2(size[0]+canvas.textsize("     ")[0]+20, 26);
    } else {
      return CACHEARR2(canvas.textsize(this.text+"     ")[0]+20, 26);
    }
  }
}

class UICheckBox extends UIHoverHint {
  constructor(ctx, text, pos, size, path, use_check=true) {
    UIHoverHint.call(this, ctx, path);
    
    this.draw_check = use_check;
    this.ctx = ctx;
    this.set = false;
    this.mdown = false;
    this.text = text

    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }

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
    
    var csize = [20, 20]
    function draw_check() {
      var h1 = 7;
      var h2 = -3
      var ox = 5;
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
    
    if ((this.state & UIFlags.HIGHLIGHT) && this.draw_check) {
      canvas.simple_box([2, 0], [this.size[0], csize[1]])
      
      var mul = this.set ? 1.0 : 0.3;
      canvas.hlightbox([0, 0], csize, mul, 2)
      if (this.set)
        draw_check();
    } else if(this.set) {
      canvas.invbox([2, 0], csize, undefined, 2);
      if (this.draw_check)
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
    return CACHEARR2(canvas.textsize(this.text)[0]+15, 22);
  }
}

class UINumBox extends UIHoverHint {
  constructor(ctx, text, range=[0, 100], val=range[0], pos=[0,0], size=[1,1], path=undefined) {
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
    this.slide_power = 2.0;
    this.slide_mul = 1.0;
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
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
    var mpos = CACHEARR2(event.x, event.y);
    
    if (this.clicked) {
      var df = (mpos[0] - this.start_mpos[0]) / 300.0
      
      var sign = df < 0.0 ? -1.0 : 1.0;
      
      if (!this.is_int) {
        df = Math.pow(df, this.slide_power)*this.slide_mul;
        if (df == NaN)
          df = 0.0;
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
      
      if (this.callback != undefined) {
        this.callback(this, this.val);
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
    var valstr = Unit.gen_string(this.val, unit);
    
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
    return CACHEARR2(canvas.textsize(this.text)[0]+70, 26);
  }
}

class UILabel extends UIElement {
  constructor(ctx, text, pos, size, path) {
    UIElement.call(this, ctx, path);

    this.prop = undefined;
    this.val = text;
    this.text = text;
    this.bgcolor = undefined;
    this.color = undefined;

    if (this.state & UIFlags.USE_PATH) {
      this.prop = ctx.api.get_prop_meta(ctx, this.data_path);
      this.val = this.prop.data;
      this.text = this.prop.uiname + ": "
    }

    this.clicked = false;
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    this.callback = undefined;
  }
  
  set_background(Array<float> color) {
    this.bgcolor = new Vector4(color);
    this.do_recalc();
  }
  
  set_color(Array<float> color) {
    this.color = new Vector4(color);
    this.do_recalc();
  }
  
  set_text(String text) {
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
    if (g_app_state.was_touch)
      this.start_pan(event, 0);
    
    if (event.button == 0) {
      this.clicked = true;
    }  
  }
  
  on_mouseup(MouseEvent event) {
    if (event.button == 0) {
      this.clicked = false;
      
      if (inrect_2d_button([event.x, event.y], [0,0], this.size)) {
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
    
    if (this.bgcolor) {
      canvas.box([0, 0], this.size, this.bgcolor);
    }
    
    var tsize = canvas.textsize(this.text);
    canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.25], this.text, this.color);
    
    canvas.end(this);
    //canvas.pop_scissor();
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    var pad = this.bgcolor != undefined ? 20 : 4;
    return CACHEARR2(canvas.textsize(this.text)[0]+pad, 26)
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
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
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
      
      if (inrect_2d_button([event.x, event.y], [0,0], this.size)) {
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
    
    var tsize = canvas.textsize(this.text, menu_text_size);
    canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.25], this.text, undefined, menu_text_size);
    
    //canvas.pop_scissor();  
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return CACHEARR2(canvas.textsize(this.text, menu_text_size)[0]+4, 26);
  }
}

class UIListBox extends ColumnFrame {
  constructor(ctx, pos, size, callback) {
    ColumnFrame.call(this, ctx);
    
    if (size != undefined && size[0]+size[1] != 0.0)
      this.size = size;
    else
      this.size = [500, 350]; //default size;
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    
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
    this.listbox.min_size = CACHEARR2(this.size[0]-26, this.size[1])
    
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
      return CACHEARR2(500, 300);
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
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
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
    return CACHEARR2(26, 26)
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
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
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
    return CACHEARR2(26, 26*3)
  }
}

/*draws 16x16 "small" icons*/
class UIIconCheck extends UIHoverHint {
  constructor(ctx, text, int icon, pos, size, path, use_check=true) {
    UIHoverHint.call(this, ctx, path);
    
    this.ctx = ctx;
    this.set = false;
    this.mdown = false;
    this.text = text
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    this.callback = undefined;
    this.icon = icon;
    
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
      
      this.do_recalc();
    }  
  }

  on_mouseup(MouseEvent event) {
    if (this.mdown) {
      this.pop_modal();
      this.mdown = false;
      
      if (this.callback != undefined)
        this.callback(this, this.set);
      
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.set);
      }
    }  
  }

  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    var csize = [24, 24];
    
    if (this.state & UIFlags.HIGHLIGHT) {
      canvas.simple_box([0, 0], [this.size[0], csize[1]])
      
      if (this.set) {
        canvas.invbox([0, 0], this.size, 0.9, 2);
      } else {
        canvas.hlightbox([0, 0], this.size);
      }
    } else if(this.set) {
      canvas.invbox([0, 0], this.size, undefined, 2);
    } else {
      canvas.box([0, 0], this.size, undefined, 2);
    }
    
    var tsize = canvas.textsize(this.text);
    canvas.text([csize[0]+5, (this.size[1]-tsize[1])*0.25], this.text);
    
    var pos = [4, 4];
    canvas.icon(this.icon, pos, 0.75, true);
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return CACHEARR2(canvas.textsize(this.text)[0]+24, 24)
  }
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