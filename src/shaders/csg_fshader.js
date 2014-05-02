var csg_draw_shader = """//fragment
    precision mediump float;
    uniform mat4 u_modelViewProjMatrix;
    uniform mat4 u_cameraMatrix;
    uniform mat4 u_normalMatrix;
    uniform vec4 color;
    
    uniform sampler2D sampler2d;

    varying vec4 g_Color;
    varying vec3 v_Normal;
    
    void main()
    { 
      gl_FragColor = color;
    }
"""

var csg_draw_shader2 = """//fragment
    precision mediump float;
    uniform mat4 u_modelViewProjMatrix;
    uniform mat4 u_cameraMatrix;
    uniform mat4 u_normalMatrix;
    uniform vec4 color;
    
    uniform sampler2D sampler2d;
    uniform float width;
    uniform float height;
    uniform float off;
    uniform float is_sub;
    
    varying vec4 g_Color;
    varying vec3 v_Normal;
    
    float mod2(float r) {
      float mod = floor((r/2.0) - floor(r/2.0)+0.5);
      return mod;
    }
    
    void main()
    {
      vec2 co = vec2(gl_FragCoord[0]/width, gl_FragCoord[1]/height);
      vec4 clr = texture2D(sampler2d, co);
      float r = floor(clr[0] * 255.0) + off;
      float d = dot(v_Normal, vec3(0, 0, 1));
      float r2 = floor(clr[1] * 255.0);
      
      float moda = mod2(r);
      float modb = mod2(r2);
      
      if (is_sub < 0.5) {
        modb = 1.0 - modb;
      }
      
      clr = color * (abs(d)*0.5 + 0.5);
      clr[3] = modb;
      //clr[1] *= 80.0;
      //clr[2] = 0.5;
      gl_FragColor = clr;
    }
"""
