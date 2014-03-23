"use strict";

var LayerTypes = {
  UV: 0, //loop data
  COL: 1, //loop data
  TEXTURE: 2, //whole face data
};

class GeoData {
  pack(Array<byte> data) {
  }
  
  unpack(DataView data, unpack_ctx uctx) {
  }
}

class GeoLayerType {
  consturctor(int type, String name) {
    this.type = type;
    this.name = name;
  }
  
  copy(GeoData dest, GeoData source) {
  }
  
  create_data() : GeoLayerData {
  }
  
  interp(GArray<GeoLayerType> data, GArray<float> weights) {
    var i = 0;
    for (var w in weights) {
      var d = data[i];
      //do something like w += d*w;
      i += 1;
    }
    
    //stores result in this
  }
  
  release(GeoData data) {
    //probably unnecassary for most data types
  }

  sum(GeoData dest, GArray<GeoData> lst) {
  }

  average(GeoData dest, GArray<GeoData> lst) {
  }

  add(GeoData a, GeoData b) {
  }

  sub(GeoData a, GeoData b) {
  }

  mul(GeoData a, GeoData b) {
  }

  div(GeoData, GeoData b) {
  }
}

class UVLayerData extends GeoData {
  constructor(Vector2 uv) {
    static uvld_init = new Vector2([0.0, 0.0]);
    GeoData.call(this);
    
    if (uv == undefined)
      uv = uvld_init;
    
    this.uv = new Vector2(uv);
  }
}

class UVLayer extends GeoLayerType {
  constructor(String name) {
    GeoLayerType.call(this, LayerTypes.UV, name);
  }

  create_data() {
    return new UVLayerData();
  }

  copy(dest, source) {
    dest.uv = new Vector2(source.uv);
  }

  interp(GeoData _dest, GArray<GeoData> data, GArray<float> weights) {
    var i = 0;
    var uv = new Vector2();
    
    for (i=0; i<weights.length; i++) {
      var UVLayerData uvd = data[i];
      
      uv[0] += uvd.uv[0]*weights[i];
      uv[1] += uvd.uv[1]*weights[i];
    }
    
    var UVLayerData dest = _dest;
    dest.uv = uv;
  }

  sum(GeoData _dest, GArray<GeoData> _lst) {
    var i = 0;
    var uv = new Vector2();
    
    var UVLayerData dest = _dest;
    var GArray<UVLayerData> lst = _lst;
    
    for (i=0; i<weights.length; i++) {
      var UVLayerData uvd = data[i];
      
      uv[0] += data[i].uv[0];
      uv[1] += data[i].uv[1];
    }
    
    dest.uv = uv;
  }

  average(GeoData _dest, _lst) {
    var UVLayerData dest = _dest;
    var GArray<UVLayerData> lst = _lst;
    var i = 0;
    var uv = new Vector2();
    var w = 1.0 / data.length;
    
    for (i=0; i<weights.length; i++) {
      uv[0] += data[i].uv[0]*w;
      uv[1] += data[i].uv[1]*w;
    }
    
    dest.uv = uv;
  }
}

class ElementData extends GArray {
  constructor() {
    GArray.call(this);
  }

  pack(Array<byte> data) {
  }

  unpack(ArrayBuffer data, unpack_ctx uctx) {
  }
}

var _g_data_types = {}
_g_data_types[LayerTypes.UV] = UVLayer;

class GeoDataLayout {
  constructor() {
    //note that layer names will be stored in a template array in
    //the main mesh, not in each individual geometric element
    this.layout = new GArray<GeoLayerType>([]); //layout of geodata layers
    this.active_layers = {}; 
  }
  
  interp(GeoData dest, GArray<GeoData> elements, GArray<float> weights) {
    var arr = new GArray(elements);
        
    for (var i=0; i<this.layout.length; i++) {
      for (var j=0; j<elements.length; j++) {
        arr[j] = elements[j][i];
      }
      
      this.layout[i].interp(dest[i], arr, weights);
    }
  }
  
  element_init(Element element) {
    for (var i=0; i<this.layout.length; i++) {
      element.push(this.layout[i].create_data());
    }
  }
  
  copy(GeoData dest, GeoData source) {
    if (dest.length == 0 && dest.length != source.length)
      this.element_init(dest);
    
    for (var i=0; i<dest.length; i++) {
      this.layout[i].copy(dest[i], source[i]);
    }
  }
  
  get_data(GeoData type, GeoData data) {
    return data[this.active_layers[type]];
  }
  
  get_data_n(GeoLayerType type, GeoData data, int n) : GeoLayerType {
    var j = 0;
    for (var i=0; i<this.layout.length; i++) {
      var l = this.layout[i];
      
      if (l.type == type) {
        if (j == n) return data[j];
        j++;
      }
    }
    
    return null;
  }
  
  numlayers(GeoLayerType type) {
    var i = 0;
    
    for (var l in this.layout) {
      if (l.type == type) 
        i++;
    }
    
    return i;
  }
  
  _get_layer_index_n(GeoLayerType type, int n) {
    var i = 0, j = 0;
    
    for (var l in this.layers) {
      if (l.type == type) {
        if (i == n) return j;
        i++;
      }
      
      j++;
    }
    
    return -1;
  }
  
  //elements is any iterable collection of Element derivatives
  //creates a new data layer, but does *not* set ii as active,
  //unless it's the first layer of its type created.
  add_layer(GeoLayerType type, String name, Iterator elements) {
    var layer = new _g_data_types[type](name);
    this.layout.push(layer);
    
    if (!this.active_layers.hasOwnProperty(type)) {
      this.active_layers[type] = this.layout.length-1;
    }
    
    for (var _e in elements) {
      var Element e = _e;
      e.gdata.push(layer.create_new());
    }
  }
  
  _find_new_active(GeoLayerType type) {
    for (var l in this.layers) {
      if (l.type == type) {
        this.active_layers[type] = l;
        return;
      }
    }
    
    delete this.active_layers[type];
  }
  
  rem_layer_n(GeoLayerType type, int n, Iterator elements) {
    var li = this._get_layer_index_n(type, n);
    if (li < 0) 
      return;
    
    var layer = this.layout[li];
    var was_active = layer==this.active_layers[type];
    
    var lay = this.layout;
    var li = lay.indexOf(layer);
    lay.splice(li, 1);
    
    for (var _e in elements) {
      var Edge e = _e;
      
      e.splice(li, 1);
    }
  }
}

