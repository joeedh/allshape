"use strict";

#include "src/core/utildefine.js"

class UIButtonAbstract extends UIHoverHint {
  Boolean clicked, click_on_down, can_pan, modal_click, was_touch;
  Array<float> start_mpos;
  int text_size;
  
  constructor(ctx, path=undefined, pos=undefined, size=undefined) {
    UIHoverHint.call(this, ctx, path, pos, size);
    
    this.text_size = undefined; //use default
    this.can_pan = true;
    this.clicked = false;
    this.click_on_down = false; //is ignored for multitouch
    this.modal_click = undefined; //defaults to !click_on_down
    this.was_touch = false;
    this.start_mpos = new Vector2();
  }
  
  on_click(MouseEvent event) {
  }
  
  on_mousedown(MouseEvent event) {
    //console.log("button down");
    if (!this.clicked) {
      this.was_touch = 0; //g_app_state.was_touch;
      this.modal_click = !this.click_on_down || this.was_touch;
      
      this.start_mpos.load([event.x, event.y]);
      
      if (event.button == 0 && !this.clicked) {
        if (this.modal_click)
          this.parent.push_modal(this);
        this.stop_hover();
        
        this.clicked = true;
        this.do_recalc();
        
        if (!this.was_touch && this.click_on_down) {
          this.on_click(event);
        }
      }  
    } else {
      if (this.parent.modalhandler == this) {
        this.parent.pop_modal();
      }
    }
  }

  on_mouseup(MouseEvent event) {
    //console.log("button up");
    if (event.button == 0 && this.clicked) {
      if (this.modal_click)
        this.parent.pop_modal();
      this.modal_click = false;
      this.clicked = false;
      this.do_recalc();
      
      
      var click = this.was_touch || !this.click_on_down;
      if (click) { // && inrect_2d_button([event.x, event.y], [0, 0], this.size)) {
        this.on_click(event);
      }
    }  
  }
  
  on_mousemove(MouseEvent event) {
    if (!this.clicked) {
      this.start_hover();
    }
    
    if (this.can_pan && this.was_touch) {
      var mpos = [event.x, event.y];
      var dis = this.start_mpos.vectorDistance(mpos);
      
      if (dis > 60) { // && !inrect_2d_button(mpos, [0, 0], this.size)) {
        if (this.clicked && this.modal_click)
          this.parent.pop_modal();
        this.modal_click = false;
        
        this.stop_hover();
        this.clicked = false;
        this.do_recalc();
        this.start_pan([event.x, event.y]);
      }
    }
  }
}

//buttons only take executable (function) paths as arguments
class UIButton extends UIButtonAbstract {
  constructor(Context ctx, String text, Array<float> pos, 
              Array<float> size, String path=undefined, 
              Function callback=undefined, String hint=undefined) 
  {
    UIButtonAbstract.call(this, ctx, path, pos, size);
    
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
      
      //console.log("hotkey: ", hotkey);
      if (hotkey != undefined) {
        if (ret != "") ret += "\n"
        ret += "      Hotkey: " + hotkey.build_str(true) + "  ";
      }
      
      return ret == "" ? undefined : ret;
    }
  }
  
  on_click(MouseEvent event) {
    if (this.callback != undefined) {
      this.callback(this);
    }
    
    if (this.state & UIFlags.USE_PATH) {
      this.ctx.api.call_op(this.ctx, this.data_path);
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
    
    var tsize = canvas.textsize(this.text, this.text_size);
    
    if (tsize[0] < this.size[0])
      canvas.text([(this.size[0]-tsize[0])*0.5, (this.size[1]-tsize[1])*0.5], this.text, uicolors["BoxText"], this.text_size);
    else
      canvas.text([5, (this.size[1]-tsize[1])*0.5], this.text, uicolors["BoxText"], this.text_size);
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return CACHEARR2(canvas.textsize(this.text, this.text_size)[0]+12, 26)
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
        canvas.box(pos, size, uicolors["IconInv"]);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.box(pos, size, uicolors["HighlightIcon"])
      else 
        canvas.box(pos, this.size, uicolors["IconBox"]);
      
      return;
    }
    
    var pad = this.pad;
    
    var isize = this.small_icon ? canvas.iconsheet16.cellsize : canvas.iconsheet.cellsize;
    if (isize[0] > this.size[0])
      pos[0] = 1; //(isize[0] - this.size[0] + pad*2.0)*0.5;
    else
      pos[0] = 1; //(t+ pad*2.0)*0.5;
    pos[1] = 0;
    
    var size = this.size;
    //size[0] = isize[0]+pad*2.0;
    //size[1] = isize[1]+pad*2.0;
    
    if (this.bgmode == "button") {
      if (this.clicked) 
        canvas.box(pos, size, uicolors["IconInv"]);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.box(pos, size, uicolors["HighlightIcon"])
      else 
        canvas.box(pos, this.size, uicolors["IconBox"]);
        
    } else if (this.bgmode == "flat") {
      static high_clr = [0.9, 0.9, 0.9, 0.2];
      static inset_clr = [0.3, 0.3, 0.3, 0.2];
      
      if (this.clicked) 
        canvas.box(pos, size, inset_clr);
      else if (this.state & UIFlags.HIGHLIGHT)
        canvas.box(pos, size, high_clr);
    }
    
    //center within button
    if (size[0] > isize[0])
      pos[0] += (size[0]-isize[0])*0.5;
    if (size[1] > isize[1])
      pos[1] += (size[1]-isize[1])*0.5;
    
    if (this.small_icon)    
      canvas.icon(this.icon, pos, 0.75, true);
    else
      canvas.icon(this.icon, pos, 0.75, false);
    
    canvas.end(this);
  }
}

class UIMenuButton extends UIButtonAbstract {
  constructor(ctx, menu, pos, size, path, description="") {//menu can be undefined, if path is defined
    UIButtonAbstract.call(this, ctx, path);
    
    this.menu = menu : UIMenu;
    
    this.click_on_down = true;
    
    this.description = "";
    this.ctx = ctx;
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
        
        if (!DEBUG.data_api_timing)
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

  on_click(MouseEvent event) {
    var canvas = this.get_canvas();
    var viewport = canvas.viewport;
    var menu = this.menu;
    var vx = g_app_state.screen.size[0];
    var vy = g_app_state.screen.size[1];
    
    menu.minwidth = this.size[0];
    menu.packmenu(canvas);
    
    var off = [0, Math.floor(this.size[1]-3)];
    
    if (this.abspos[1]+off[1]+menu.size[1] > vy) {
        off = [0, -menu.size[1]];
    }
    
    this.call_menu(menu, off, this.size[0]);
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

    var tsize = canvas.textsize(this.text, this.text_size);
    var x = Math.floor((this.size[0]-tsize[0]-siz-p*3)/2)
    var y = Math.floor((this.size[1]-tsize[1])/4);
    
    if (!this.clicked)
      canvas.text([x, y], this.text, uicolors["BoxText"], this.text_size);
    
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
    this.update_callback = undefined;
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }

    this.callback = undefined;
    this.update_callback = undefined;
    
    this.prop = undefined : ToolProperty;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = this.get_prop_meta();
    }
  }

  on_tick() {
    UIHoverHint.prototype.on_tick.call(this);
    
    if (!this.mdown && this.update_callback != undefined) {
      this.update_callback(this);
    } else if (!this.mdown && (this.state & UIFlags.USE_PATH)) {
      var val = this.get_prop_data();
      
      if (val != this.set) {
        this.set = val;
        if (!DEBUG.data_api_timing)
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
    return CACHEARR2(canvas.textsize(this.text)[0]+22, 22);
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
    
    if (event.button == 0 && !this.clicked && !event.shiftKey) {
      this.set_prop_data(this.val, true);

      this.push_modal()
      
      this.start_mpos = [event.x, event.y]
      this.start_val = this.val
      this.stop_hover();
      this.clicked = true;
      this.do_recalc();
    } else if (event.button == 2 && !this.clicked) {
      var this2 = this;
      
      function callback(entry, id) {
        if (id == 0) {
          this2.swap_textbox();
        }
      }
      
      var menu = new UIMenu("", callback);
      menu.add_item("Manual input", "", 0);
      
      this.call_menu(menu);
    } else if (event.shiftKey) {
      this.swap_textbox();
    }
  }

  swap_textbox() {
    var numbox = this;
    function unit_error(numbox) {
      console.log(["numbox error", numbox]);
      numbox.flash(UIFlags.REDERROR);
      numbox.do_recalc();
    }
    
    //callback for ending text edit swap;
    function on_end_edit(tbox, cancelled) {
      tbox.parent.replace(tbox, numbox);
      numbox.set_val(Unit.parse(tbox.text, numbox.val, unit_error, numbox, numbox.unit));
    }
    
    //swap out with text button
    var unit = this.unit;
    
    var valstr = Unit.gen_string(this.val, unit);      
    var textbox = new UITextBox(this.ctx, valstr, this.pos, this.size);
    
    textbox.packflag |= PackFlags.NO_REPACK;
    this.parent.do_full_recalc();
    this.parent.replace(this, textbox);
    
    textbox.begin_edit(event);
    textbox.set_cursor();
    
    textbox.on_end_edit = on_end_edit;  
  }
  
  on_mouseup(MouseEvent event) {
    if (this.clicked && event.button == 0) {
      this.pop_modal();
      
      this.clicked = false;
      
      var limit = g_app_state.was_touch ? 5 : 1;
      if (Math.abs(this.start_mpos[0]-event.x) <= limit && Math.abs(this.start_mpos[1]-event.y) <= limit) { 
        var df = Math.min((this.range[1] - this.range[0])*0.1, 1.0);
        if (event.x < this.size[0]/2.0) {
          df = -df;
        }
        
        this.val += df;
        this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1])
      }
      
      if (this.callback != undefined) {
        this.callback(this, this.val);
      }
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.val, false);
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
        
        if (!DEBUG.data_api_timing)
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
        var odf = df;
        df = Math.pow(df, this.slide_power)*this.slide_mul;
        if (df == NaN)
          df = odf*odf;
        df *= sign;
      }
      
      df *= this.range[1] - this.range[0]
    
      this.val = this.start_val + df
      this.val = Math.min(Math.max(this.val, this.range[0]), this.range[1])
      if (this.is_int)
        this.val = Math.floor(this.val);
        
      this.do_recalc()
      
      if (this.state & UIFlags.USE_PATH) {
        this.set_prop_data(this.val, false);
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
    var valstr = this.is_int ? this.val.toString() : Unit.gen_string(this.val, unit);
    
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
    
    this.start_mpos = new Vector2();
    this.prop = undefined;
    this.val = text;
    this.text = text;
    this.bgcolor = undefined;
    this.color = undefined;
    this.did_modal = false;
    this.clicked = false;
    this.was_touch = false;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = ctx.api.get_prop_meta(ctx, this.data_path);
      this.val = this.prop.data;
      this.text = this.prop.uiname + ": "
    }

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
    prior(UILabel, this).on_tick.call(this);
    
    if (this.state & UIFlags.USE_PATH) {
      var val = this.get_prop_data();
      if (val != this.val) {
        this.val = val;
        this.text = this.prop.uiname + ": " + val.toString();

        if (!DEBUG.data_api_timing)
          this.do_recalc();
      }
    }
  }
  
  on_mousemove(MouseEvent event) {
    var dis = this.start_mpos.vectorDistance([event.x, event.y]);
    //console.trace();
    
    if (this.clicked) {
      var dis = this.start_mpos.vectorDistance([event.x, event.y]);
      
      console.log("-dis", dis, event.x, event.y, this.start_mpos[0], this.start_mpos[1]);
      if (dis > 4) {
        //cancel, then pan
        
        if (this.did_modal) {
          this.pop_modal();
          this.did_modal = false;
        }
        
        this.clicked = false;
        this.start_pan(this.start_mpos, 0, [event.x, event.y]);
      }
    } else {
      //console.log("dis", dis, event.x, event.y, this.start_mpos[0], this.start_mpos[1]);
    }
    
    prior(UILabel, this).on_mousemove.call(this, event);
  }
  
  on_mousedown(MouseEvent event) {
    //console.log("md", event.x, event.y);
    
    this.start_mpos.load([event.x, event.y]);
    this.was_touch = g_app_state.was_touch;
    
    //sanity check
    //reset, in case event order got messed up
    if (this.clicked) {
      if (this.do_modal)
        this.push_modal()
      
      this.clicked = false;
      this.do_recalc();
    }
   
    if (!this.clicked && event.button == 0) {
      this.clicked = true;
      
      if (!this.was_touch && this.callback != undefined) {
        this.callback(this);
      }
        
      if (!this.did_modal) {
        this.push_modal();
        this.did_modal = true;
      }
    }
  }
  
  on_mouseup(MouseEvent event) {
    if (this.did_modal) {
      this.pop_modal();
      this.did_modal = false;
    }
    
    if (this.clicked) {
      this.clicked = false;
      
      if (this.was_touch && inrect_2d_button([event.x, event.y], [0,0], this.size)) {
        //console.log("clicked")
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
    prior(UIMenuLabel, this).on_tick.call(this);
    
    if (this.clicked && this.menu != undefined && this.menu.closed) {
      this.clicked = false;
  
      if (!DEBUG.data_api_timing)
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
        //console.log("clicked")
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
    
    var pflag = PackFlags.IGNORE_LIMIT | PackFlags.NO_AUTO_SPACING;
    pflag |= PackFlags.INHERIT_WIDTH|PackFlags.ALIGN_LEFT;

    this.listbox = new RowFrame(ctx);
    
    //no spacing allowed; messes up velocity pan
    this.listbox.packflag |= PackFlags.NO_AUTO_SPACING;
    this.listbox.pad[1] = 0;
    
    this.listbox.state |= UIFlags.HAS_PAN;
    this.add(this.listbox, pflag);
    
    this.active_entry = undefined : UIListEntry;
    this.callback = callback;
    this.mdown = false;
    
    this.vscroll = new UIVScroll(ctx, [0, 0])
    this.vscroll.packflag |= PackFlags.INHERIT_HEIGHT;
    
    this.scrollx = 0;
    this.scrolly = 0;
    
    var this2=this;
    this.vscroll.callback = function(vscroll, value) {
      this2._vscroll_callback(vscroll, value);
    }
    this.vscroll.step = 26;
    this.add(this.vscroll);
    
    this.packflag |= PackFlags.ALIGN_LEFT;
    this.state |= UIFlags.NO_FRAME_CACHE;
  }
  
  on_tick() {
    prior(UIListBox, this).on_tick.call(this);
    
    this.vscroll.set_value(this.listbox.velpan.pan[1]);
  }
  
  load_filedata(ObjectMap map) {
    prior(UIListBox, this).load_filedata.call(this, map);
    if ("active_entry" in map) {
      var act = map["active_entry"];
      var i = 0;
      
      for (var c in this.listbox.children) {
        if (c.text == act) {
          this._set_active(c);
          break;
        }
      }
    }
  }
  
  get_filedata() : ObjectMap {
    var ret = prior(UIListBox, this).get_filedata.call(this);
    if (ret == undefined) ret = {};
    
    if (this.active_entry != undefined)
      ret["active_entry"] = this.active_entry.text;
    
    return ret;
  }
  
   _vscroll_callback(vscroll, value)
  {
    static pan = [0, 0];
    pan[1] = value;
    
    this.listbox.velpan.set_pan(pan);
    this.listbox.do_full_recalc();
    this.do_full_recalc();
  }

  on_mouseup(event) {
    prior(UIListBox, this).on_mouseup.call(this, event);
    
    if (this.listbox.active != undefined && 
        this.listbox.active instanceof UIListEntry)
    {
      this._set_active(this.listbox.active);
    }
  }
  
  jump(int off) {
    if (this.active_entry == undefined) return;
    
    var i = this.listbox.children.indexOf(this.active_entry) + off;
    i = Math.min(Math.max(0, i), this.listbox.children.length-1);
    
    this._set_active(this.listbox.children[i]);
  }
  
  _set_active(entry) {
    if (this.active_entry != entry && this.active_entry != undefined) {
      this.active_entry.do_recalc();
    }
    
    this.active_entry = entry;
    if (entry != undefined) {
      entry.do_recalc();
      if (this.callback != undefined) {
        this.callback(this, this.active_entry.text, this.active_entry.id);
      }
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
    
    var this2 = this;
    entry.callback = function(entry) {
      this2._set_active(entry);
    }
    
    this.listbox.add(entry, PackFlags.ALIGN_LEFT);
    this.do_recalc();
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.push_scissor([0,0], this.size);
    
    canvas.simple_box([0,0], this.size, uicolors["ListBoxBG"]);
    prior(UIListBox, this).build_draw.call(this, canvas, isVertical);
    
    canvas.pop_scissor();
  }

  reset()
  {
    this.listbox.children = new GArray();
    this.do_recalc();
  }

  pack(UICanvas canvas, Boolean is_vertical)
  {
    this.listbox.size[0] = this.size[0]-26;
    this.listbox.size[1] = this.size[1];
    this.listbox.packflag |= PackFlags.KEEP_SIZE;
    
    prior(UIListBox, this).pack.call(this, canvas, is_vertical);
    
    //paranoid check. . .this should not be necassary, but it is.
    //ger!
    this.listbox.pan_bounds[0][0] = 0;
    this.listbox.pan_bounds[0][1] = 0;
    
    this.vscroll.pos[1] = 0;
    this.vscroll.size[1] = this.size[1];
    
    this.vscroll.set_range([0, this.listbox.pan_bounds[1][1]]);
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
  //id can be any arbitrary object,
  //including non-stringable types.
  constructor(ctx, text, Object id) {
    UILabel.call(this, ctx, text);
    
    this.id = id;
  }
    
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.begin(this);
    
    if (this == this.parent.parent.active_entry) {
      canvas.simple_box([0,0], this.size);
      canvas.simple_box([0,0], this.size);
    } else if (this.state & UIFlags.HIGHLIGHT) {
      //canvas.simple_box([0,0], this.size);
    }
    
    var tsize = canvas.textsize(this.text);
    canvas.text([7, (this.size[1]-tsize[1])*0.25], this.text, uicolors["ListBoxText"]);
    
    canvas.end(this);
  }
}

class ScrollButton extends UIElement {
  constructor(ctx, pos, size, icon, callback, do_repeat=true) {
    UIElement.call(this, ctx);
    
    this.repeat = do_repeat;
    
    this.boxclr = undefined;
    this.highclr = undefined;
    this.invclr = undefined;
    
    this.icon = icon;
    this.clicked = false;
    this.do_modal = true;
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    
    this.callback = callback;
    this.repeat_ival = 100;
    this.last_ms = 0;
  }
  
  on_tick() {
    if (this.clicked && this.repeat && time_ms() - this.last_ms > this.repeat_ival) {
      this.last_ms = time_ms();
      this.callback(this, [-1, -1]);
    }
  }
  
  on_mousedown(MouseEvent event) {
    if (event.button == 0 && !this.clicked) {
      if (this.do_modal)
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
      if (this.do_modal)
        this.pop_modal();
      this.clicked = false;
      this.do_recalc();    
    }
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    if (this.clicked) 
      canvas.box2([1, 1], this.size, this.invclr);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.box2([1, 1], this.size, this.highclr); 
    else 
      canvas.box2([1, 1], this.size, this.boxclr);
      
    if (this.icon != undefined) {
      var clr = this.clicked ? undefined : [0.5, 0.5, 0.5, 1.0];
      canvas.icon(this.icon, IsMobile ? [3, 7] : [0, 0], undefined, true, clr);
    }    
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    if (IsMobile) {
      return CACHEARR2(26, 26);
    } else {
      return CACHEARR2(18, 18);
    }
  }
}

class UIVScroll extends UIFrame {
  constructor(ctx, range, pos=[0,0], size=[0,0], callback=undefined) {
    UIFrame.call(this, ctx);
    
    this.state |= UIFlags.NO_FRAME_CACHE;
    this.packflag |= PackFlags.INHERIT_HEIGHT;
    this.packflag |= PackFlags.ALIGN_RIGHT;
    
    this.step = undefined : float;
    this.clicked = false;
    this.click_sign = 1;
    
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
    
    this.but1 = new ScrollButton(ctx, [0,0], [0,0], Icons.SCROLL_DOWN)
    this.but1.repeat = true;
    this.add(this.but1);
    
    this.but2 = new ScrollButton(ctx, [0,0], [0,0], Icons.SCROLL_UP);
    this.but2.repeat = true;
    this.add(this.but2);
    
    this.bar = new ScrollButton(ctx, [0,0], [0,0], undefined);
    this.bar.repeat = false;
    this.bar.do_modal = false;
    this.barsize = 32;
    this.add(this.bar);
    
    this.bar.boxclr = uicolors["ScrollBar"];
    this.bar.highclr = uicolors["ScrollBarHigh"];
    this.bar.invclr = uicolors["ScrollInv"];
    this.but1.boxclr = uicolors["ScrollButton"];
    this.but1.highclr = uicolors["ScrollButtonHigh"];
    this.but1.invclr = uicolors["ScrollInv"];
    this.but2.boxclr = uicolors["ScrollButton"];
    this.but2.highclr = uicolors["ScrollButtonHigh"];
    this.but2.invclr = uicolors["ScrollInv"];
    
    this.last_ms = 0;
    this.dragging = false;
    this.last_mpos = [0,0];
    this.did_modal = false;
    
    var this2=this;
    function bar_callback(button, mpos) {
      mpos = [0, mpos[1]+button.pos[1]]; //+button.pos[1]+button.parent.pos[1]];
      this2.do_drag(mpos);
    }
    this.bar.callback = bar_callback;
    /*function(button, mpos) {
      mpos = [0, mpos[1]+this2.pos[1]+button.pos[1]+this2.bar.pos[1]];
      console.log("mpos", mpos);
      this2.do_drag(mpos);
    }*/
    
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
    
    this.parent.push_modal(this);
    
    //console.log("dragging");
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
    
    if (this.val != val)
      this.do_recalc();
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
  
  on_inactive() {
    this.clicked = false;
    prior(UIVScroll, this).on_inactive.call(this);
  }
  
  on_tick() {
    prior(UIVScroll, this).on_tick.call(this);
    
    //ensure pan doesn't steal mouseup event
    this.state &= ~UIFlags.USE_PAN;
    
    if (this.clicked && this.modalhandler != undefined) {
      this.clicked = false;
    }
    
    if (this.clicked && time_ms() - this.last_ms > 200) {
      this.increment(this.click_sign*4);
    }
  }
  
  on_mousedown(MouseEvent event) {    
    if (!this.dragging) {
      prior(UIVScroll, this).on_mousedown.call(this, event, false);
    }
    
    if (this.modalhandler == undefined && this.active == undefined) {
      this.clicked = true;
      this.last_ms = time_ms()+200;
      
      if (event.y > this.bar.pos[1]+this.bar.size[1]) {
        this.click_sign = -1;
        this.increment(-4);
      } else {
        this.click_sign = 1;
        this.increment(4);
      }
    }
  }

  on_mouseup(MouseEvent event) {
    this.clicked = false;
    
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
      var mpos = [event.x-this.parent.pos[0], event.y-this.parent.pos[1]];
      
      var y = mpos[1]-this.last_mpos[1];
      
      if (Math.abs(y) < 4) return;
      
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
    var sizey = Math.floor(this.size[0]*1.25);
    
    this.but1.size = [this.size[0], sizey];
    this.but2.pos = [0, this.size[1]-sizey-1];
    this.but2.size = [this.size[0], sizey];

    this.pack_bar();
  }

  build_draw(UICanvas canvas, Boolean isVertical) 
  {
    canvas.frame_begin(this);
    //(this.is_canvas_root(), this.canvas, this);
    //console.log(this.parent.get_canvas());
    
    this.pack(canvas, isVertical);
    if (this.range[1]-this.range[0] == 0.0) {
      canvas.box2([1,0], this.size, uicolors["ScrollBG"]);
      return;
    }
    
    this.canvas = canvas;
    
    canvas.box2([1,0], this.size, uicolors["ScrollBG"]);
    
    this.draw_background = false;
    prior(UIVScroll, this).build_draw.call(this, canvas, isVertical, false);

    canvas.frame_end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    if (IsMobile)
      return CACHEARR2(28, 28*3);
    else
      return CACHEARR2(15, 18*3);
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
    this.update_callback = undefined;
    this.icon = icon;
    
    this.prop = undefined : ToolProperty;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = this.get_prop_meta();
    }
  }

  on_tick() {
    UIHoverHint.prototype.on_tick.call(this);

    if (!this.mdown && this.update_callback != undefined) {
      this.update_callback(this);
    } else if (!this.mdown && (this.state & UIFlags.USE_PATH)) {
      var val = this.get_prop_data();
      
      if (val != this.set) {
        this.set = val;
        if (!DEBUG.data_api_timing)
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
