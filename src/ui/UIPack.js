"use strict";

var PackFlags = {
  INHERIT_HEIGHT :       1, INHERIT_WIDTH :     2, 
  ALIGN_RIGHT :          4, ALIGN_LEFT :        8, 
  ALIGN_CENTER :        16, ALIGN_BOTTOM :     32, 
  IGNORE_LIMIT :        64, NO_REPACK :       128,
  UI_DATAPATH_IGNORE : 256, USE_ICON :  1024|2048,
  USE_SMALL_ICON :    1024, USE_LARGE_ICON : 2048,
  ENUM_STRIP :        4096
}

class UIPackFrame extends UIFrame {
  constructor(ctx, path_prefix)
  {
    UIFrame.call(this, ctx);
    
    if (path_prefix == undefined)
      path_prefix = ""
    
    this.path_prefix = path_prefix;
    this.min_size = undefined : Array<float>;
    
    this.last_ms = 0;
    this.last_pos = new Vector2();
    this.last_size = new Vector2();
    this.default_packflag = 0;
  }
 
  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    prior(UIPackFrame, this).on_resize.call(this, newsize, oldsize);
    
    //var canvas = this.get_canvas();
    //if (canvas != undefined)
    //  this.pack(canvas, false);
  }

  toolop(path, inherit_flag=0, label=undefined) {
    var ctx = this.ctx;
    var opname = ctx.api.get_op_uiname(ctx, path);
    
    inherit_flag |= this.default_packflag;
    
    if (opname == undefined) {
      console.trace();
      console.log("couldn't find tool operator at path" + path + ".");
      return;
    }
    
    if (label != undefined)
      opname = label;
    
    if (inherit_flag & PackFlags.USE_ICON) {
      var op = ctx.api.get_op(ctx, path);
      if (op == undefined) {
        console.trace();
        console.log("Error fetching operator ", path);
        var c = new UIButton(ctx, "???");
        
        c.packflag |= inherit_flag;
        this.add(c);
        return;
      }
      
      if (DEBUG.icons)
        console.log("icon toolop", op.icon);
      
      if (op.icon >= 0) {
        var use_small = inherit_flag & PackFlags.USE_SMALL_ICON;
        
        var c = new UIButtonIcon(ctx, opname, op.icon, [0,0], [0,0], path, undefined, undefined, use_small);
        c.packflag |= inherit_flag;
        this.add(c);
        return; //NON-PRECONDITION EXIT POINT
      }
    }
    
    var c = new UIButton(ctx, opname, [0,0], [0,0], path);
    
    if (inherit_flag != undefined) 
      c.packflag |= inherit_flag;
      
    this.add(c);
  }

  pack(canvas, isVertical) {
    //this.last_pos.load(this.pos);
    //this.last_size.load(this.size);
  }

  prop(path, packflag=0) {
    packflag |= this.default_packflag;
    
    if (this.path_prefix.length > 0)
      path = this.path_prefix + "." + path

    var ctx = this.ctx;
    var prop = ctx.api.get_prop_meta(ctx, path)
    
    if (prop == undefined) {
      console.trace();
      console.log("couldn't find property: " + path + ".", this.path_prefix);
      return;
    }
    
    if (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT) {
      var range = prop.range;
      if (prop.range == undefined || (prop.range[0] == 0 && prop.range[1] == 0)) {
        range = [-2000, 2000];
      }
      
      var c = new UINumBox(ctx, prop.uiname, range, prop.data, [0,0], [0,0], path);
      c.packflag = packflag;
      c.unit = prop.unit;
      
      this.add(c);
    } else if (prop.type == PropTypes.ENUM && (packflag & PackFlags.ENUM_STRIP)) {
      console.log("enum strip");
      var checkmap = {};
      var this2 = this;
      prop.ctx = ctx;
      
      function update_enum(chk, val) {
        console.log("enum strip update");

        //only allow check sets
        if (!val) {
          chk.set = true;
          return;
        }
        
        for (var k in checkmap) {
          var check = checkmap[k];
          if (check == chk) {
            prop.ctx = this2.ctx;
            prop.set_value(k);
            prop.set_data(prop.data);
            continue;
          }
          
          check.set = false;
          check.do_recalc();
        }
        
        var val = prop.values[k];
      }
      
      var subframe;
      if (this instanceof ColumnFrame) {
        subframe = this.col();
      } else {
        subframe = this.row();
      }
      
      subframe.packflag |= packflag;
      
      if (packflag & PackFlags.USE_ICON) {
        for (var k in prop.values) {
          var label = prop.ui_value_names != undefined ? prop.ui_value_names[k] : k;
          if (label == undefined) label = "(error)";
          
          var c = new UIIconCheck(ctx, "", prop.iconmap[prop.values[k]]);
          
          c.callback = update_enum
          c.icon = prop.iconmap[k];
          c.draw_check = false;
          
          c.description = label + "\n" + prop.description;
          
          if (prop.get_value() == prop.values[k])
            c.set = true;
          
          subframe.add(c);
          checkmap[prop.values[k]] = c;
        }
      } else {
        for (var k in prop.values) {
          var label = prop.ui_value_names != undefined ? prop.ui_value_names[k] : k;
          if (label == undefined) label = "(error)";
          
          var c = new UICheckBox(ctx, label);
          c.callback = update_enum
          c.draw_check = false;
          
          if (prop.get_value() == prop.values[k])
            c.set = true;
            
          subframe.add(c);
          checkmap[prop.values[k]] = c;
        }
      }
    } else if (prop.type == PropTypes.ENUM) {
      var c = new UIMenuButton(ctx, undefined, [0,0], [0,0], path);
      
      c.packflag |= packflag;
      this.add(c)
    } else if (prop.type == PropTypes.VEC3) {
        range = (prop.range != undefined && prop.range[0] != undefined) ? prop.range : [-2000, 2000];
        
        var row = this.row();
        row.packflag = packflag;
        
        row.label(prop.uiname);
        var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
        
        var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
        
        var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
    } else if (prop.type == PropTypes.VEC4) {
        range = (prop.range != undefined && prop.range[0] != undefined) ? prop.range : [-2000, 2000];
        
        var row = this.row();
        
        row.label(prop.uiname);
        var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);

        var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);

        var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);

        var c = new UINumBox(ctx, "W", range, prop.data, [0,0], [0,0], path + "[3]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);
    } else if (prop.type == PropTypes.STRING && (prop.flag & TPropFlags.LABEL)) {
      this.label(path, true, packflag);
    } else if (prop.type == PropTypes.BOOL) {
      var check = new UICheckBox(ctx, prop.uiname, undefined, undefined, path);
      check.packflag |= packflag;
      this.add(check);
    } else if (prop.type == PropTypes.FLAG) {
      var row = this.row();
      row.packflag |= packflag;
      
      row.label(prop.uiname + ":");
      for (var k in prop.ui_value_names) {
        var path2 = path + "["+prop.keys[prop.ui_value_names[k]]+"]"
        var check = new UICheckBox(ctx, k, undefined, undefined, path2);
        check.packflag |= PackFlags.INHERIT_WIDTH;
        
        row.add(check);
      }
    }
    else {
      if (DEBUG.ui_datapaths)
        console.log("warning: unimplemented property type for path " + path + " in user interface code");
    }
  }

  label(text, use_path, align=0) { //use_path, align are optional
    align |= this.default_packflag;
    
    if (use_path != undefined && use_path) {
      var c = new UILabel(this.ctx, "", [0,0], [0,0], text);
      this.add(c);
      
      if (align)
        c.packflag |= align;
      
      return c;
    } else {
      var c = new UILabel(this.ctx, text, [0,0], [0,0], undefined);
      this.add(c);
      
      if (align)
        c.packflag |= align;
      
      return c;
    }
  }

  row(String path_prefix="", int align=0) { //path_prefix is optional
    align |= this.default_packflag;
    
    var row = new RowFrame(this.ctx, this.path_prefix);
    this.add(row);
    
    row.default_packflag |= this.default_packflag;
    row.packflag |= align;
      
    return row;
  }

  col(String  path_prefix="", int align=0) { //path_prefix is optional
    align |= this.default_packflag;
    
    var col = new ColumnFrame(this.ctx, this.path_prefix);
    this.add(col);
    
    col.default_packflag |= this.default_packflag;
    col.packflag |= align;
    
    return col;
  }
  
  on_tick() {
    UIFrame.prototype.on_tick.call(this);
    this._pack_recalc();
  }
  
  _pack_recalc() 
  {
    if (time_ms()-this.last_ms < 40) {
      return;
    }
    
    this.last_ms = time_ms();
     
    //flag a complete recalc of parent container
    //if size or position has changed,
    //as the canvas cached will be messed up
    //otherwise.
    
    if (this.last_pos.vectorDistance(this.pos) > 0.0001 || this.last_size.vectorDistance(this.size) > 0.00001) {
      //console.log("complex ui recalc", this.pos, this.last_pos.toString(), this.last_pos.vectorDistance(this.pos), this.last_size.vectorDistance(this.size));
      this.parent.do_full_recalc();
      
      for (var c in this.children) {
        if (!(c instanceof UIFrame)) {
          c.recalc = 1;
        }
      }
      
      this.last_pos.load(this.pos);
      this.last_size.load(this.size);
    }
  }
}

class RowFrame extends UIPackFrame {
  constructor(ctx, path_prefix, align)
  {
    UIPackFrame.call(this, ctx, path_prefix);
    this.packflag |= PackFlags.INHERIT_HEIGHT|align;
  }

  get_min_size(UICanvas canvas, Boolean isvertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in get_min_size");
      return;
    }
    
    var maxwidth = 0;
    var tothgt = 0;
    
    for (var c in this.children) {
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, isvertical);
      else
        size = [c.size[0], c.size[1]];
      
      tothgt += size[1]+2;
      maxwidth = Math.max(maxwidth, size[0]+2);
    }
    
    if (this.min_size != undefined) {
      maxwidth = Math.max(maxwidth, this.min_size[0]);
      tothgt = Math.max(tothgt, this.min_size[1]);
    }
    
    return [Math.max(maxwidth, 1), Math.max(tothgt, 1)];
  }

  pack(UICanvas canvas, Boolean is_vertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in pack");
      return;
    }
    
    if (this.size[0] == 0 && this.size[1] == 0) {
      this.size[0] = this.parent.size[0];
      this.size[1] = this.parent.size[1];
    }
    
    var minsize = this.get_min_size(canvas, is_vertical);
    var spacing = Math.floor((this.size[1] - minsize[1])/this.children.length);
    if (spacing < 0) spacing = 0;
    spacing = Math.min(spacing, 4.0);
    
    var x = 0;
    var y;
    
    if (this.packflag & PackFlags.ALIGN_BOTTOM)
      y = 2;
    else
      y = this.size[1];
    
    for (var i=0; i<this.children.length; i++) {
      var c = this.children[i];
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, is_vertical);
      else
        size = [c.size[0], c.size[1]]
      
      size[0] = Math.min(size[0], this.size[0]);
      if (c.packflag & PackFlags.INHERIT_WIDTH)
        size[0] = this.size[0]-2
      
      c.size = size;
      var final_y = y;
      if (!(this.packflag & PackFlags.ALIGN_BOTTOM))
        final_y -= size[1];
      
      if (this.packflag & PackFlags.ALIGN_RIGHT) {
        c.pos = [this.size[0]-size[0]-x, final_y];
      } else if (this.packflag & PackFlags.ALIGN_LEFT) {
        c.pos = [x, final_y];
      } else {
        c.pos = [x + Math.floor(0.5*(this.size[0]-size[0])), final_y];
      }
      
      if (this.packflag & PackFlags.ALIGN_BOTTOM)
        y += c.size[1]+spacing;
      else
        y -= c.size[1]+spacing;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, is_vertical);
    }
    
    //this._pack_recalc();
    UIPackFrame.prototype.pack.call(this, canvas, is_vertical);
    //this.size[1] = Math.max(this.size[1], minsize[1]);
  }
}

class ColumnFrame extends UIPackFrame {
  constructor(ctx, path_prefix, align)
  {
    UIPackFrame.call(this, ctx, path_prefix);
    this.packflag |= PackFlags.INHERIT_WIDTH|align
  }

  get_min_size(UICanvas canvas, Boolean isvertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in get_min_size");
      return;
    }
    
    var maxheight = 0;
    var totwid = 0;
    
    for (var c in this.children) {
      var size;
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, isvertical);
      else
        size = [c.size[0], c.size[1]];
        
      totwid += size[0]+2;
      maxheight = Math.max(maxheight, size[1]+2);
    }
    
    if (this.min_size != undefined) {
      totwid = Math.max(totwid, this.min_size[0]);
      maxheight = Math.max(maxheight, this.min_size[1]);
    }
    
    return [totwid, maxheight];
  }

  pack(UICanvas canvas, Boolean is_vertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in pack");
      return;
    }

    if (this.size[0] == 0 && this.size[1] == 0) {
      this.size[0] = this.parent.size[0];
      this.size[1] = this.parent.size[1];
    }
    
    var minsize = this.get_min_size(canvas, is_vertical);
    var spacing = Math.floor((this.size[0] - minsize[0])/this.children.length);
    if (spacing < 0) spacing = 0;
    spacing = Math.min(spacing, 4.0);
    
    var sum=0;
    var max_wid = 0;
    var max_hgt = 0;
    for (var c in this.children) {
      var s;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        s = c.get_min_size(canvas, is_vertical);
      else
        s = [c.size[0], c.size[1]];
      
      max_wid = Math.max(s[0], max_wid);
      max_hgt = Math.max(s[1], max_hgt);
      sum += s[0];
    }
    
    var x;
    var y = (this.size[1] - max_hgt)*0.5;
    var pad = 4;
    max_wid *= ((this.size[0])/sum);
    
    if (!(this.packflag & PackFlags.ALIGN_LEFT) && !(this.packflag & PackFlags.ALIGN_RIGHT))
      this.packflag |= PackFlags.ALIGN_CENTER;
      
    if (this.packflag & PackFlags.ALIGN_RIGHT) {
      x = this.size[0]-3;
    } else if (this.packflag & PackFlags.ALIGN_LEFT) {
      x = 3;
    } else {
      x = 0;
    }
      
    for (var c in this.children) {
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, is_vertical);
      else
        size = [c.size[0], c.size[1]];
        
      if (!(this.packflag & PackFlags.IGNORE_LIMIT)) {
        if (c.packflag & PackFlags.INHERIT_WIDTH)
          size[0] = max_wid-pad;
        else
          size[0] = Math.min(size[0], max_wid-pad);
      }
      
      if (c.packflag & PackFlags.INHERIT_HEIGHT)
        size[1] = this.size[1]-6
        
      c.size = size;
      if (this.packflag & PackFlags.ALIGN_RIGHT) {
        c.pos = [x-size[0], y];
        x -= Math.floor(size[0]+pad+spacing);
      } else {
        c.pos = [x, y];
        x += Math.floor(size[0]+pad+spacing);
      }
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, is_vertical);
    }
    
    if ((this.packflag & PackFlags.ALIGN_CENTER) && x < this.size[0]) {
      for (var c in this.children) {
        c.pos[0] += Math.floor((this.size[0]-x)*0.5);
      }
    }
    
    //this._pack_recalc();
    UIPackFrame.prototype.pack.call(this, canvas, is_vertical);
  }
}

var _te = 0;
class ToolOpFrame extends RowFrame {
  constructor(ctx, path) {
    RowFrame.call(this, ctx, path);
    this.rebuild = true;
    this.strct = undefined;
    this.ctx = ctx;
  }

  do_rebuild(ctx) {
    var strct = this.ctx.api.get_struct(ctx, this.path_prefix);
    
    this.children = new GArray([]);
    
    if (strct == undefined) return;
    
    this.strct = strct;
    for (var p in strct) {
      if (!(p.flag & PackFlags.UI_DATAPATH_IGNORE))
        this.prop(p.name, PackFlags.INHERIT_WIDTH);
    }
  }

  on_tick() {
    var strct = this.ctx.api.get_struct(this.ctx, this.path_prefix);
    
    if (strct != this.strct) {
      this.do_rebuild(this.ctx);
      this.do_recalc();
    }
    
    RowFrame.prototype.on_tick.call(this);
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    if (this.rebuild) {
      this.do_rebuild(this.ctx);
      this.rebuild = false;
    }
    
    canvas.simple_box([0,0], this.size, [0.2, 0.2, 0.2, 0.1]);
    RowFrame.prototype.build_draw.call(this, canvas, isVertical);
  }
}
