function GeoData() {
}
create_prototype(GeoData);

GeoData.prototype.pack = function(Array<byte> data)
{
}

GeoData.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx)
{

}

function GeoLayerType(int type, String name) {
  this.type = type;
  this.name = name;
}
create_prototype(GeoLayerType);

GeoLayerType.prototype.copy = function(GeoData dest, GeoData source) {
  
}

GeoLayerType.prototype.create_data = function() {
}

GeoLayerType.prototype.interp = function(Array<GeoLayerType> data, Array<float> weights) {
  var i = 0;
  for (var w in weights) {
    d = data[i];
    //do something like w += d*w;
    i += 1;
  }
  
  //stores result in this
}

GeoLayerType.prototype.release = function(GeoData data) {
  //probably unnecassary for most data types
}

GeoLayerType.prototype.sum = function(GeoData dest, Array<GeoData> lst) {
}

GeoLayerType.prototype.average = function(GeoData dest, Array<GeoData> lst) {
}

GeoLayerType.prototype.add = function(GeoData a, GeoData b) {
}

GeoLayerType.prototype.sub = function(GeoData a, GeoData b) {
}

GeoLayerType.prototype.mul = function(GeoData a, GeoData b) {
}

GeoLayerType.prototype.div = function(GeoData, GeoData b) {
}

LayerTypes = {
  UV: 0, //loop data
  COL: 1, //loop data
  TEXTURE: 2, //whole face data
};

_uvld_init = new Vector2([0.0, 0.0]);
function UVLayerData(Vector2 uv) {
  GeoData.call(this);
  
  if (uv == undefined)
    uv = _uvld_init;
  
  this.uv = new Vector2(uv);
}

inherit(UVLayerData, GeoData);

function UVLayer(String name) {
  this.prototype = Object.create(GeoLayerType.prototype);
  GeoDataLayer.call(this, LayerTypes.UV, name);
}
inherit(UVLayer, GeoLayerType);

UVLayer.prototype.create_data = function() {
  return new UVLayerData();
}

UVLayer.prototype.copy = function(dest, source) {
  dest.uv = new Vector2(source.uv);
}

UVLayer.prototype.interp = function(GeoData _dest, Array<GeoData> data, Array<float> weights) {
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

UVLayer.prototype.sum = function(GeoData _dest, Array<GeoData> _lst) {
  var i = 0;
  var uv = new Vector2();
  
  var UVLayerData dest = _dest;
  var Array<UVLayerData> lst = _lst;
  
  for (i=0; i<weights.length; i++) {
    var UVLayerData uvd = data[i];
    
    uv[0] += data[i].uv[0];
    uv[1] += data[i].uv[1];
  }
  
  dest.uv = uv;
}

UVLayer.prototype.average = function(GeoData _dest, _lst) {
  var UVLayerData dest = _dest;
  var Array<UVLayerData> lst = _lst;
  var i = 0;
  var uv = new Vector2();
  var w = 1.0 / data.length;
  
  for (i=0; i<weights.length; i++) {
    uv[0] += data[i].uv[0]*w;
    uv[1] += data[i].uv[1]*w;
  }
  
  dest.uv = uv;
}

function ElementData() {
  Array.call(this);
}
ElementData.prototype = Object.create(GArray.prototype);

ElementData.prototype.pack = function(Array<byte> data)
{
}

ElementData.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx)
{
}

_g_data_types = {}
_g_data_types[LayerTypes.UV] = UVLayer;

function GeoDataLayout() {
  //note that layer names will be stored in a template array in
  //the main mesh, not in each individual geometric element
  this.layout = new GArray<GeoLayerType>([]); //layout of geodata layers
  this.active_layers = {}; 
  
  this.interp = function(GeoData dest, Array<GeoData> elements, Array<float> weights) {
    var arr = new GArray(elements);
        
    for (var i=0; i<this.layout.length; i++) {
      for (var j=0; j<elements.length; j++) {
        arr[j] = elements[j][i];
      }
      
      this.layout[i].interp(dest[i], arr, weights);
    }
  }
  
  this.element_init = function(Element element) {
    for (var i=0; i<this.layout.length; i++) {
      element.push(this.layout[i].create_data());
    }
  }
  
  this.copy = function(GeoData dest, GeoData source) {
    if (dest.length == 0 && dest.length != source.length)
      this.element_init(dest);
    
    for (var i=0; i<dest.length; i++) {
      this.layout[i].copy(dest[i], source[i]);
    }
  }
  
  this.get_data = function(GeoData type, GeoData data) {
    return data[this.active_layers[type]];
  }
  
  this.get_data_n = function(GeoLayerType type, GeoData data, int n) : GeoLayerType {
    var j = 0;
    for (var i=0; i<this.layout.length; i++) {
      l = this.layout[i];
      
      if (l.type == type) {
        if (j == n) return data[j];
        j++;
      }
    }
    
    return null;
  }
  
  this.numlayers = function(GeoLayerType type) {
    var i = 0;
    
    for (var l in this.layout) {
      if (l.type == type) 
        i++;
    }
    
    return i;
  }
  
  this._get_layer_index_n = function(GeoLayerType type, int n) {
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
  this.add_layer = function(GeoLayerType type, String name, Iterator elements) {
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
  
  this._find_new_active = function(GeoLayerType type) {
    for (var l in this.layers) {
      if (l.type == type) {
        this.active_layers[type] = l;
        return;
      }
    }
    
    delete this.active_layers[type];
  }
  
  this.rem_layer_n = function(GeoLayerType type, int n, Iterator elements) {
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

